import { expect, it } from 'vitest';
import type { DraftCollection } from './collection-types.ts';
import { buildVideoScenes, videoLength } from './video-project.ts';

it('keeps trimmed captions aligned and puts every timestamp in the last scene', () => {
  const project: DraftCollection = {
    draft: {
      id: 'draft',
      title: 'River ferries',
      createdAt: 0,
      updatedAt: 0,
      mode: 'video',
      overrides: {},
      order: ['clip', 'excerpt', 'reaction'],
    },
    clips: [
      {
        id: 'clip',
        draftId: 'draft',
        createdAt: 0,
        kind: 'video',
        title: 'River ferries',
        sourceUrl: 'https://example.com/video#t=10',
        trim: { start: 2, end: 6 },
        video: {
          source: 'https://example.com/video',
          start: 10,
          end: 20,
          cues: [{ start: 1, end: 4, text: 'Captions in the source.' }],
        },
      },
      {
        id: 'excerpt',
        draftId: 'draft',
        createdAt: 1,
        kind: 'text',
        title: 'Ferry report',
        text: 'The boats depart in the morning.',
        sourceUrl: 'https://example.net/report',
      },
      {
        id: 'reaction',
        draftId: 'draft',
        createdAt: 2,
        kind: 'gif',
        title: 'A local reaction',
        sourceUrl: null,
        reaction: true,
      },
    ],
  };
  const scenes = buildVideoScenes(project);
  expect(scenes.map(({ kind }) => kind)).toEqual([
    'title',
    'clip',
    'excerpt',
    'reaction',
    'sources',
  ]);
  const recorded = scenes[1];
  expect(recorded).toMatchObject({
    at: 2.5,
    seconds: 4,
    url: 'https://example.com/video#t=12',
    cues: [{ start: 0, end: 2, text: 'Captions in the source.' }],
  });
  expect(scenes.at(-1)).toMatchObject({
    sources: [
      { url: 'https://example.com/video#t=12', range: { start: 12, end: 16 } },
      { url: 'https://example.net/report' },
    ],
  });
  expect(videoLength(scenes)).toBe(15.5);
  project.draft.videoOptions = { captions: false };
  expect(buildVideoScenes(project)[1]).toHaveProperty('cues', []);
});
