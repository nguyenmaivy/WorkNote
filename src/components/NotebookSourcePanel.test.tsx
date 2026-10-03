import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NotebookSourcePanel from './NotebookSourcePanel';
import { notebookApi } from '../services/notebookService';
import type { NotebookPage, NotebookSource } from '../types';

vi.mock('../services/notebookService', () => ({
  notebookApi: { updatePage: vi.fn(), addSourceFromUrl: vi.fn(), uploadSource: vi.fn(), deleteSource: vi.fn() },
}));

const source: NotebookSource = {
  id: 'source-react', type: 'text', title: 'React notes', content: 'State belongs to a component.',
  createdAt: '2026-10-03', updatedAt: '2026-10-03',
};
const notebook: NotebookPage = {
  id: 'notebook-react', title: 'React', content: '', sourceIds: [], createdAt: '2026-10-03', updatedAt: '2026-10-03',
};

describe('Notebook source attachment', () => {
  beforeEach(() => vi.resetAllMocks());

  it('attaches a source to the selected notebook and updates the UI after saving', async () => {
    const updated = { ...notebook, sourceIds: [source.id] };
    vi.mocked(notebookApi.updatePage).mockResolvedValue(updated);
    const onPageUpdate = vi.fn();
    const props = { sources: [source], activePage: notebook, onSourcesChange: vi.fn(), onPageUpdate };
    const view = render(<NotebookSourcePanel {...props} />);
    await userEvent.click(screen.getByRole('button', { name: '+ Đính kèm vào trang' }));
    expect(notebookApi.updatePage).toHaveBeenCalledWith(notebook.id, { sourceIds: [source.id] });
    await waitFor(() => expect(onPageUpdate).toHaveBeenCalledWith(updated));
    view.rerender(<NotebookSourcePanel {...props} activePage={updated} />);
    expect(screen.getByRole('button', { name: '✓ Đã đính kèm' })).toBeInTheDocument();
  });

  it('shows a failed save without pretending the source was attached', async () => {
    vi.mocked(notebookApi.updatePage).mockRejectedValue(new Error('Unable to save source'));
    const onPageUpdate = vi.fn();
    render(<NotebookSourcePanel sources={[source]} activePage={notebook} onSourcesChange={vi.fn()} onPageUpdate={onPageUpdate} />);
    await userEvent.click(screen.getByRole('button', { name: '+ Đính kèm vào trang' }));
    expect(await screen.findByText('Unable to save source')).toBeInTheDocument();
    expect(onPageUpdate).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '+ Đính kèm vào trang' })).toBeInTheDocument();
  });

  it('does not offer attachment when no notebook is selected', () => {
    render(<NotebookSourcePanel sources={[source]} activePage={null} onSourcesChange={vi.fn()} onPageUpdate={vi.fn()} />);
    expect(screen.getByText('React notes')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+ Đính kèm vào trang' })).not.toBeInTheDocument();
  });
});
