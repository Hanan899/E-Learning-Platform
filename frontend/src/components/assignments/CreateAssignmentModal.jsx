import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const assignmentSchema = z.object({
  courseId: z.string().trim().min(1, 'Course is required'),
  title: z.string().trim().min(1, 'Title is required'),
  description: z.string().trim().min(1, 'Description is required'),
  dueDate: z
    .string()
    .min(1, 'Due date is required')
    .refine((value) => new Date(value).getTime() > Date.now(), 'Due date must be in the future'),
  maxScore: z.coerce.number().min(1, 'Max score must be at least 1').max(1000, 'Max score cannot exceed 1000'),
});

function CreateAssignmentModal({ isOpen, onClose, onSubmit, courses }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      courseId: '',
      title: '',
      description: '',
      dueDate: '',
      maxScore: 100,
    },
  });

  const closeModal = () => {
    reset();
    onClose();
  };

  const submitForm = async (values) => {
    await onSubmit({
      ...values,
      maxScore: Number(values.maxScore),
    });
    closeModal();
  };

  return (
    <Dialog open={isOpen} onClose={closeModal} className="relative z-50">
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="card w-full max-w-2xl p-6 shadow-gentle">
          <DialogTitle className="text-2xl font-bold">Create Assignment</DialogTitle>
          <p className="mt-2 text-sm text-slate-500">
            Choose a course, set the deadline, and notify enrolled students right away.
          </p>

          <form className="mt-6 space-y-5" onSubmit={handleSubmit(submitForm)}>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="assignment-course">
                Course
              </label>
              <select id="assignment-course" className="input" {...register('courseId')}>
                <option value="">Select a course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
              {errors.courseId ? <p className="mt-2 text-sm text-danger">{errors.courseId.message}</p> : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="assignment-title">
                Title
              </label>
              <input id="assignment-title" className="input" {...register('title')} />
              {errors.title ? <p className="mt-2 text-sm text-danger">{errors.title.message}</p> : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="assignment-description">
                Description
              </label>
              <textarea
                id="assignment-description"
                className="input min-h-[140px] resize-none"
                {...register('description')}
              />
              {errors.description ? (
                <p className="mt-2 text-sm text-danger">{errors.description.message}</p>
              ) : null}
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="assignment-due-date">
                  Due date
                </label>
                <input id="assignment-due-date" type="datetime-local" className="input" {...register('dueDate')} />
                {errors.dueDate ? <p className="mt-2 text-sm text-danger">{errors.dueDate.message}</p> : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="assignment-max-score">
                  Max score
                </label>
                <input id="assignment-max-score" type="number" className="input" {...register('maxScore')} />
                {errors.maxScore ? <p className="mt-2 text-sm text-danger">{errors.maxScore.message}</p> : null}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={closeModal}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Assignment'}
              </button>
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

export default CreateAssignmentModal;
