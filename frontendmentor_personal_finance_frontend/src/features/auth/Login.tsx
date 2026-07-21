import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router";
import { useAppDispatch, useAppSelector } from "@/app/store";
import { fetchLogin } from "@/features/auth/authSlice";
import AuthLayout from "@/features/auth/AuthLayout";
import PasswordInput from "@/components/auth/PasswordInput";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required.")
    .email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

type LoginValues = z.infer<typeof loginSchema>;

function Login() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const loginLoading = useAppSelector((state) => state.auth.loginLoading);
  const loginError = useAppSelector((state) => state.auth.loginError);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (values: LoginValues) => {
    dispatch(fetchLogin(values))
      .unwrap()
      .then(() => navigate("/", { replace: true }))
      .catch(() => {
        // error is surfaced via state.auth.loginError
      });
  };

  return (
    <AuthLayout>
      <h1 className="text-[2rem] font-bold text-grey-900">Login</h1>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className="mt-8 flex flex-col gap-8"
      >
        <FieldGroup className="gap-4">
          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="login-email" className="text-xs text-grey-500">
                  Email
                </FieldLabel>
                <Input
                  {...field}
                  id="login-email"
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
                  htmlFor="login-password"
                  className="text-xs text-grey-500"
                >
                  Password
                </FieldLabel>
                <PasswordInput
                  {...field}
                  id="login-password"
                  autoComplete="current-password"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </FieldGroup>

        {loginError && (
          <p role="alert" className="-mt-4 text-center text-sm text-destructive">
            {loginError}
          </p>
        )}

        <Button type="submit" disabled={loginLoading} className="h-13 w-full">
          {loginLoading ? <Spinner /> : "Login"}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-grey-500">
        Need to create an account?{" "}
        <Link to="/signup" className="font-bold text-grey-900 underline">
          Sign Up
        </Link>
      </p>
    </AuthLayout>
  );
}

export default Login;
