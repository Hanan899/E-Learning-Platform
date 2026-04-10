import { useEffect, useState } from 'react';
import {
  HiOutlineDocumentText,
  HiOutlineFilm,
  HiOutlinePhoto,
  HiOutlineTrash,
} from 'react-icons/hi2';

const materialIcons = {
  pdf: HiOutlineDocumentText,
  document: HiOutlineDocumentText,
  image: HiOutlinePhoto,
  video_link: HiOutlineFilm,
};

function LessonEditor({
  lesson,
  onSave,
  onDelete,
  onUploadMaterial,
  onDeleteMaterial,
}) {
  const [draft, setDraft] = useState(lesson);
  const [videoUrl, setVideoUrl] = useState('');
  const [showVideoInput, setShowVideoInput] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    setDraft(lesson);
    setVideoUrl('');
    setShowVideoInput(false);
    setUploadProgress(0);
  }, [lesson]);

  if (!lesson) {
    return (
      <div className="card flex min-h-[500px] items-center justify-center p-10 text-center text-slate-500">
        Select a lesson from the course outline or create a new one to begin editing.
      </div>
    );
  }

  const handleMaterialUpload = async (file) => {
    setUploadProgress(5);
    await onUploadMaterial(lesson.id, { file }, (progressEvent) => {
      const total = progressEvent.total || 1;
      setUploadProgress(Math.round((progressEvent.loaded / total) * 100));
    });
    setUploadProgress(0);
  };

  const handleVideoSubmit = async () => {
    if (!videoUrl.trim()) {
      return;
    }

    await onUploadMaterial(lesson.id, {
      url: videoUrl.trim(),
      type: 'video_link',
      title: 'Video link',
    });

    setVideoUrl('');
    setShowVideoInput(false);
  };

  return (
    <div className="space-y-5">
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <label className="mb-2 block text-sm font-medium text-slate-700">Lesson Title</label>
            <input
              className="input"
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            />
          </div>
          <button type="button" className="btn-secondary mt-7 text-danger" onClick={() => onDelete(lesson.id)}>
            Delete Lesson
          </button>
        </div>

        <div className="mt-5">
          <label className="mb-2 block text-sm font-medium text-slate-700">Content</label>
          <textarea
            className="input min-h-[220px] resize-none"
            value={draft.content || ''}
            onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))}
          />
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-slate-700">Editor</p>
            <div className="mt-2 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
              Markdown-style notes are supported here. Use headings and lists to organize the lesson.
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700">Preview</p>
            <div className="mt-2 min-h-[120px] rounded-2xl border border-slate-100 bg-white p-4 text-sm leading-7 text-slate-700">
              {draft.content || 'Lesson preview will appear here as you type.'}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button type="button" className="btn-primary" onClick={() => onSave(lesson.id, draft)}>
            Save Lesson
          </button>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-bold">Materials</h3>
            <p className="mt-1 text-sm text-slate-500">Upload files or attach a video link for this lesson.</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <label className="btn-secondary cursor-pointer">
              Upload Material
              <input
                type="file"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    handleMaterialUpload(file);
                  }
                }}
              />
            </label>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowVideoInput((value) => !value)}
            >
              Add Video Link
            </button>
          </div>
        </div>

        {uploadProgress > 0 ? (
          <div className="mt-4">
            <div className="h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${uploadProgress}%` }} />
            </div>
            <p className="mt-2 text-sm text-slate-500">Uploading... {uploadProgress}%</p>
          </div>
        ) : null}

        {showVideoInput ? (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              className="input"
              placeholder="https://www.youtube.com/watch?v=..."
              value={videoUrl}
              onChange={(event) => setVideoUrl(event.target.value)}
            />
            <button type="button" className="btn-primary sm:min-w-[140px]" onClick={handleVideoSubmit}>
              Save Link
            </button>
          </div>
        ) : null}

        <div className="mt-6 space-y-3">
          {(lesson.materials || []).map((material) => {
            const Icon = materialIcons[material.type] || HiOutlineDocumentText;

            return (
              <div
                key={material.id}
                className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-primary">
                    <Icon className="text-2xl" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{material.title}</p>
                    <p className="text-sm text-slate-500">
                      {material.type === 'video_link'
                        ? material.url
                        : `${material.fileSize ? `${Math.round(material.fileSize / 1024)} KB` : 'File'} • ${material.type}`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500"
                  onClick={() => onDeleteMaterial(material.id)}
                >
                  <HiOutlineTrash className="text-xl" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default LessonEditor;
