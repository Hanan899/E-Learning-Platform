import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const courseSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  description: z.string().trim().min(20, 'Description must be at least 20 characters'),
  category: z.string().trim().min(1, 'Category is required'),
});

const categories = ['Math', 'Science', 'History', 'Language Arts', 'Technology'];

function CreateCourseModal({ isOpen, onClose, onSubmit }) {
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      title: '',
      description: '',
      category: '',
    },
  });

  const previewUrl = useMemo(
    () => (thumbnailFile ? URL.createObjectURL(thumbnailFile) : null),
    [thumbnailFile]
  );

  const closeModal = () => {
    reset();
    setThumbnailFile(null);
    onClose();
  };

  const submitForm = async (values) => {
    await onSubmit({
      ...values,
      thumbnail: thumbnailFile,
    });
    closeModal();
  };

  const handleFileSelection = (file) => {
    if (file) {
      setThumbnailFile(file);
    }
  };

  return (
    <Dialog open={isOpen} onClose={closeModal} className="relative z-50">
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="card w-full max-w-2xl p-6 shadow-gentle">
          <DialogTitle className="text-2xl font-bold">Create New Course</DialogTitle>
          <p className="mt-2 text-sm text-slate-500">
            Set up the course shell, upload a cover image, and publish when ready.
          </p>

          <form className="mt-6 space-y-5" onSubmit={handleSubmit(submitForm)}>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="course-title">
                Title
              </label>
              <input id="course-title" className="input" {...register('title')} />
              {errors.title ? <p className="mt-2 text-sm text-danger">{errors.title.message}</p> : null}
            </div>

            <div>
              <label
                className="mb-2 block text-sm font-medium text-slate-700"
                htmlFor="course-description"
              >
                Description
              </label>
              <textarea
                id="course-description"
                className="input min-h-[140px] resize-none"
                {...register('description')}
              />
              {errors.description ? (
                <p className="mt-2 text-sm text-danger">{errors.description.message}</p>
              ) : null}
            </div>

            <div>
              <label
                className="mb-2 block text-sm font-medium text-slate-700"
                htmlFor="course-category"
              >
                Category
              </label>
              <select id="course-category" className="input" {...register('category')}>
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              {errors.category ? (
                <p className="mt-2 text-sm text-danger">{errors.category.message}</p>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Thumbnail</label>
              <label className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500 hover:border-primary/40 hover:bg-primary/5">
                <input
                  type="file"
                  className="hidden"
                  accept=".jpg,.jpeg,.png"
                  onChange={(event) => handleFileSelection(event.target.files?.[0])}
                />
                {previewUrl ? (
                  <img src={previewUrl} alt="Thumbnail preview" className="h-32 w-full rounded-2xl object-cover" />
                ) : (
                  <>
                    <p className="font-medium text-slate-700">Drag & drop an image or click to browse</p>
                    <p className="mt-2">PNG and JPG files work best here.</p>
                  </>
                )}
              </label>
            </div>

            <div className="flex justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={closeModal}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Course'}
              </button>
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

export default CreateCourseModal;
