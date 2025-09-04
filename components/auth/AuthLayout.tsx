type AuthLayoutProps = {
  children: React.ReactNode;
  testimonialContent?: React.ReactNode;
};

export function AuthLayout({ children, testimonialContent }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-white">
        <div className="w-full max-w-md space-y-8">{children}</div>
      </div>

      {testimonialContent && (
        <div className="hidden lg:flex lg:flex-1 lg:items-center lg:justify-center bg-slate-900 text-white p-12">
          <div className="max-w-md">{testimonialContent}</div>
        </div>
      )}
    </div>
  );
}
