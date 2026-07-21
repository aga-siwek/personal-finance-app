import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/app/store";
import { fetchSignup } from "@/features/auth/authSlice";
import AuthLayout from "@/features/auth/AuthLayout";
import PasswordInput from "@/components/auth/PasswordInput";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

const signupSchema = z.object({
  name: z.string().min(1, "Name is required."),
  email: z
    .string()
    .min(1, "Email is required.")
    .email("Please enter a valid email address."),
  password: z.string().min(8, "Passwords must be at least 8 characters."),
});

type SignupValues = z.infer<typeof signupSchema>;

function SignUp() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const signupLoading = useAppSelector((state) => state.auth.signupLoading);
  const signupError = useAppSelector((state) => state.auth.signupError);

  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const onSubmit = (values: SignupValues) => {
    dispatch(fetchSignup(values))
      .unwrap()
      .then(() => {
        toast.success("Account created — please log in.");
        navigate("/login", { replace: true });
      })
      .catch(() => {
        // error is surfaced via state.auth.signupError
      });
  };

  return (
    <AuthLayout>
      <h1 className="text-[2rem] font-bold text-grey-900">Sign Up</h1>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className="mt-8 flex flex-col gap-8"
      >
        <FieldGroup className="gap-4">
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="signup-name" className="text-xs text-grey-500">
                  Name
                </FieldLabel>
                <Input
                  {...field}
                  id="signup-name"
                  autoComplete="name"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="signup-email" className="text-xs text-grey-500">
                  Email
                </FieldLabel>
                <Input
                  {...field}
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="password"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel
                  htmlFor="signup-password"
                  className="text-xs text-grey-500"
                >
                  Create Password
                </FieldLabel>
                <PasswordInput
                  {...field}
                  id="signup-password"
                  autoComplete="new-password"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid ? (
                  <FieldError errors={[fieldState.error]} />
                ) : (
                  <p className="text-right text-xs text-grey-500">
                    Passwords must be at least 8 characters
                  </p>
                )}
              </Field>
            )}
          />
        </FieldGroup>

        {signupError && (
          <p role="alert" className="-mt-4 text-center text-sm text-destructive">
            {signupError}
          </p>
        )}

        <Button type="submit" disabled={signupLoading} className="h-13 w-full">
          {signupLoading ? <Spinner /> : "Create Account"}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-grey-500">
        Already have an account?{" "}
        <Link to="/login" className="font-bold text-grey-900 underline">
          Login
        </Link>
      </p>
    </AuthLayout>
  );
}

export default SignUp;
