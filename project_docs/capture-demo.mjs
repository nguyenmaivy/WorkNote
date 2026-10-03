// Run from repository root with the app and local LLM running.
// Uses real UI/API responses, a fresh browser profile and a disposable notebook.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const baseURL = process.env.WORKNOTE_DEMO_URL || 'http://localhost:3000';
const out = 'project_docs/screenshots';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const evidence = { baseURL, viewport: '1600x1000', pageErrors: [], responses: [], screenshots: [] };
let createdPageId;
let createdSourceId;
page.on('pageerror', error => evidence.pageErrors.push(error.message));
page.on('response', response => {
  if (response.url().includes('/api/')) evidence.responses.push({ path: new URL(response.url()).pathname, status: response.status() });
});
async function shot(name) {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}/${name}`, animations: 'disabled' });
  evidence.screenshots.push(name);
  console.log('Captured', name);
}
try {
  // Avoid including other people's existing notebook titles or sources in screenshots.
  for (const route of ['pages', 'sources']) {
    const response = await context.request.get(`${baseURL}/api/notebook/${route}`);
    const data = await response.json();
    if (!response.ok() || !Array.isArray(data[route]) || data[route].length) {
      throw new Error('Capture requires an empty notebook store; use a separate demo checkout. Existing data was not changed.');
    }
  }
  await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByRole('heading', { name: 'Document Library', exact: true }).waitFor({ timeout: 60000 });
  await shot('01-library.png');
  await page.getByRole('button', { name: 'NotebookLM', exact: true }).click();
  const createResponse = page.waitForResponse(r => r.url().endsWith('/api/notebook/pages') && r.request().method() === 'POST');
  await page.getByTitle('Tạo notebook', { exact: true }).click();
  createdPageId = (await (await createResponse).json()).page.id;
  await page.getByPlaceholder('Tên notebook...').fill('Ôn tập React — Props & State');
  await page.getByRole('button', { name: 'Lưu tên', exact: true }).click();
  const uploadResponse = page.waitForResponse(r => r.url().includes('/api/notebook/sources/upload') && r.request().method() === 'POST');
  await page.locator('input[type=file]').setInputFiles('project_docs/examples/react-study-note.txt');
  const upload = await (await uploadResponse).json();
  createdSourceId = upload.source.id;
  await page.getByRole('button', { name: '+ Đính kèm vào trang', exact: true }).click();
  await page.getByRole('button', { name: '✓ Đã đính kèm', exact: true }).waitFor();
  await shot('02-notebook-sources.png');
  await page.getByPlaceholder('Hỏi về nội dung trong nguồn tài liệu...').fill('Theo tài liệu, state là gì và hook nào dùng để khai báo state? Trả lời ngắn trong 2 câu.');
  const chatResponse = page.waitForResponse(r => r.url().endsWith('/api/notebook/chat') && r.request().method() === 'POST', { timeout: 120000 });
  await page.getByRole('button', { name: 'Gửi', exact: true }).click();
  const chat = await chatResponse;
  const chatData = await chat.json();
  evidence.chat = { status: chat.status(), data: chatData };
  if (!chat.ok()) throw new Error(`Notebook chat failed: ${JSON.stringify(chatData)}`);
  await page.getByText('Local ·', { exact: false }).waitFor({ timeout: 10000 });
  await shot('03-notebook-chat.png');
  for (const [tab, filename] of [['Mind Maps', '04-mindmaps.png'], ['RPG Games', '05-rpg.png'], ['Spending', '06-spending.png']]) {
    await page.getByRole('button', { name: tab, exact: true }).click();
    if (tab === 'Mind Maps') {
      await page.getByRole('heading', { name: 'AI-Powered Mind Map Editor', exact: true }).waitFor();
      await page.waitForTimeout(800);
      await page.locator('main').getByRole('button', { name: 'NotebookLM', exact: true }).click();
      await page.getByRole('button', { name: /^Tạo (sơ đồ|lại)$/ }).waitFor();
      const [generated] = await Promise.all([
        page.waitForResponse(r => r.url().endsWith('/api/mindmaps/generate') && r.request().method() === 'POST', { timeout: 180000 }),
        page.getByRole('button', { name: /^Tạo (sơ đồ|lại)$/ }).click(),
      ]);
      const response = await generated;
      evidence.mindmap = { status: response.status(), data: await response.json() };
      if (!response.ok()) throw new Error(`Mindmap failed: ${JSON.stringify(evidence.mindmap)}`);
      await page.getByRole('button', { name: 'Tạo lại', exact: true }).waitFor({ timeout: 10000 });
    }
    await shot(filename);
    if (tab === 'RPG Games') {
      await page.getByRole('button', { name: 'Classic Quiz', exact: true }).click();
      await shot('07-classic-quiz.png');
    }
  }
  evidence.result = 'pass';
} catch (error) {
  console.log('Current UI:', (await page.locator('main').innerText()).slice(0, 3000));
  evidence.result = 'fail';
  evidence.error = error.message;
  throw error;
} finally {
  if (createdPageId) await context.request.delete(`${baseURL}/api/notebook/pages/${createdPageId}`);
  if (createdSourceId) await context.request.delete(`${baseURL}/api/notebook/sources/${createdSourceId}`);
  if (evidence.result === 'pass' && evidence.pageErrors.length) evidence.result = 'completed_with_page_errors';
  await writeFile(`${out}/capture-report.json`, JSON.stringify(evidence, null, 2) + '\n');
  await browser.close();
}
