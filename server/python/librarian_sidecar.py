#!/usr/bin/env python3
"""
librarian_sidecar.py — Persistent sidecar process cho semantic search.
Đọc JSON request từ stdin (1 dòng = 1 request), xuất JSON response ra stdout.
Chạy liên tục, không thoát sau mỗi request.
"""
import sys
import json
import os
import re
import torch
from transformers import AutoTokenizer, AutoModel

os.environ["TOKENIZERS_PARALLELISM"] = "false"
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
import transformers
transformers.logging.set_verbosity_error()

def mean_pooling(model_output, attention_mask):
    token_embeddings = model_output[0]
    input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
    sum_embeddings = torch.sum(token_embeddings * input_mask_expanded, 1)
    sum_mask = torch.clamp(input_mask_expanded.sum(1), min=1e-9)
    return sum_embeddings / sum_mask

def extract_best_snippet(content, query_words, max_len=280):
    sentences = re.split(r'(?<=[.!?\n])\s+', content)
    best_sent = content[:max_len]
    best_score = 0
    query_set = set(w.lower() for w in query_words if len(w) > 1)
    for s in sentences:
        s_clean = s.strip()
        if not s_clean:
            continue
        words = set(re.findall(r'\w+', s_clean.lower()))
        overlap = len(query_set.intersection(words))
        if overlap > best_score:
            best_score = overlap
            best_sent = s_clean
    if len(best_sent) > max_len:
        best_sent = best_sent[:max_len] + '...'
    return best_sent.strip() or content[:max_len]

def handle_request(data, tokenizer, model):
    query = data.get('query', '').strip()
    docs = data.get('documents', [])
    limit = int(data.get('limit', 5))
    if not query or not docs:
        return {'success': True, 'results': []}

    doc_texts = [f"{d.get('title', '')}: {d.get('content', '')[:500]}" for d in docs]
    all_texts = [query] + doc_texts

    encoded = tokenizer(all_texts, padding=True, truncation=True, max_length=256, return_tensors='pt')
    with torch.no_grad():
        outputs = model(**encoded)
        embeddings = mean_pooling(outputs, encoded['attention_mask'])
        embeddings = torch.nn.functional.normalize(embeddings, p=2, dim=1)

    query_vec = embeddings[0:1]
    doc_vecs = embeddings[1:]
    scores = torch.mm(query_vec, doc_vecs.transpose(0, 1)).squeeze(0).tolist()
    if not isinstance(scores, list):
        scores = [scores]

    query_words = re.findall(r'\w+', query)
    results = []
    for i, doc in enumerate(docs):
        results.append({
            'sourceId': doc.get('id'),
            'title': doc.get('title', ''),
            'snippet': extract_best_snippet(doc.get('content', ''), query_words),
            'score': round(float(scores[i]), 4)
        })
    results.sort(key=lambda x: x['score'], reverse=True)
    return {'success': True, 'results': results[:limit]}

def main():
    model_name = os.environ.get('EMBED_MODEL', 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2')
    sys.stderr.write(f'[sidecar] Loading model {model_name}...\n')
    sys.stderr.flush()
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModel.from_pretrained(model_name)
    model.eval()
    sys.stderr.write('[sidecar] Model ready. Listening on stdin.\n')
    sys.stderr.flush()

    # Signal ready
    print(json.dumps({'ready': True}), flush=True)

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            data = json.loads(line)
            result = handle_request(data, tokenizer, model)
        except Exception as e:
            result = {'success': False, 'error': str(e)}
        print(json.dumps(result, ensure_ascii=False), flush=True)

if __name__ == '__main__':
    main()
