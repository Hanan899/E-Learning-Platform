import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { useAuth } from '../hooks/useAuth';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'teacher@school.com',
      password: 'Teacher123!',
    },
  });

  const onSubmit = async (values) => {
    try {
      await login(values.email, values.password);
      toast.success('Welcome back');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to sign in');
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="absolute inset-0 bg-mesh-soft" />
      <div className="relative grid w-full max-w-6xl overflow-hidden rounded-[32px] bg-white shadow-gentle lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden bg-slate-950 px-10 py-12 text-white lg:block">
          <p className="inline-flex rounded-full bg-white/10 px-4 py-2 text-sm text-slate-200">
            Designed for school operations
          </p>
          <h1 className="mt-8 max-w-md text-5xl font-extrabold leading-tight text-white">
            One learning space for admins, teachers, and students.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">
            Launch courses, track assignment flow, and centralize academic progress with a calm,
            reliable dashboard built for classrooms.
          </p>
          <div className="mt-10 grid gap-4">
            {[
              'Role-aware dashboards',
              'Assignment and quiz workflows',
              'Secure file uploads and progress tracking',
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-slate-200"
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="px-6 py-10 sm:px-10">
          <div className="mx-auto max-w-md">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-primary">LearnSphere</p>
            <h2 className="mt-4 text-4xl font-extrabold">Sign in to continue</h2>
            <p className="mt-3 text-base text-slate-500">
              Use one of the seeded accounts to validate the setup quickly.
            </p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="email">
                  Email
                </label>
                <input id="email" type="email" className="input" {...register('email')} />
                {errors.email ? (
                  <p className="mt-2 text-sm text-danger">{errors.email.message}</p>
                ) : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="password">
                  Password
                </label>
                <input id="password" type="password" className="input" {...register('password')} />
                {errors.password ? (
                  <p className="mt-2 text-sm text-danger">{errors.password.message}</p>
                ) : null}
              </div>

              <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            <div className="mt-8 rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">
              <p>Demo users:</p>
              <p className="mt-2">admin@school.com / Admin123!</p>
              <p>teacher@school.com / Teacher123!</p>
              <p>student1@school.com / Student123!</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default LoginPage;
