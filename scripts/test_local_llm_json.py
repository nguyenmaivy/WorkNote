"""Check local chat forwards JSON mode without loading a model or binding a port."""
import ast
from pathlib import Path
import unittest
from unittest.mock import MagicMock


class JsonModeTests(unittest.TestCase):
    def test_only_requested_json_mode_is_forwarded(self):
        tree = ast.parse((Path(__file__).resolve().parents[1] / 'server/python/local_llm_server.py').read_text(encoding='utf-8'))
        call = next(node for node in ast.walk(tree) if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute) and node.func.attr == 'create_chat_completion')
        expression = ast.Expression(call)
        model = MagicMock()
        for body, expected in [({}, False), ({'response_format': {'type': 'json_object'}}, True), ({'response_format': {'type': 'unsupported'}}, False)]:
            eval(compile(expression, '<local-chat-call>', 'eval'), {'llm': model, 'body': body, 'messages': [], 'max_tokens': 1200, 'temperature': 0})
            kwargs = model.create_chat_completion.call_args.kwargs
            self.assertEqual('response_format' in kwargs, expected)
            if expected:
                self.assertEqual(kwargs['response_format'], {'type': 'json_object'})


if __name__ == '__main__':
    unittest.main()
