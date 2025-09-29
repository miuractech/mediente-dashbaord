import { useState } from "react";
import {
  Paper,
  TextInput,
  PasswordInput,
  Button,
  Title,
  Text,
  Container,
  Stack,
  Alert,
  LoadingOverlay,
  Anchor,
  Group,
  Box,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconCheck,
  IconEye,
  IconEyeOff,
  IconLock,
  IconMail,
} from "@tabler/icons-react";
import MedienteLogo from "../assets/Mediente-Logo.png";
import LandingImage from "../assets/landing.jpg";
import "./AdminLogin.css";
import { useNavigate } from "react-router-dom";
import authService from "./authService";
import type { LoginCredentials } from "./auth";

export default function AdminLogin() {  
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const navigate = useNavigate();
  const loginForm = useForm<LoginCredentials>({
    initialValues: {
      email: "",
      password: "",
    },
    validate: {
      email: (value) => {
        if (!value) return "Email is required";
        if (!/^\S+@\S+$/.test(value)) return "Invalid email format";
        return null;
      },
      password: (value) => {
        if (!value) return "Password is required";
        if (value.length < 8) return "Password must be at least 8 characters";
        return null;
      },
    },
  });

  const resetForm = useForm({
    initialValues: {
      email: "",
    },
    validate: {
      email: (value) => {
        if (!value) return "Email is required";
        if (!/^\S+@\S+$/.test(value)) return "Invalid email format";
        return null;
      },
    },
  });

  const handleLogin = async (values: LoginCredentials) => {
    if (isBlocked) {
      notifications.show({
        title: "Account Temporarily Blocked",
        message: "Too many failed attempts. Please reset your password.",
        color: "red",
        icon: <IconAlertCircle />,
      });
      return;
    }

    setIsLoading(true);
    // Clear any previous inline field errors before a new attempt
    loginForm.setErrors({});

    try {
      // Check failed attempts before login
      const attempts = await authService.getFailedAttemptsCount(values.email);
      if (attempts >= 3) {
        setIsBlocked(true);
        setFailedAttempts(attempts);
        notifications.show({
          title: "Too Many Failed Attempts",
          message: "Please reset your password to continue.",
          color: "red",
          icon: <IconAlertCircle />,
        });
        setIsLoading(false);
        return;
      }

      const response = await authService.login(values);

      
      if (response.error) {
        // Log failed attempt
        await authService.logFailedAttempt(values.email);
        setFailedAttempts((prev) => prev + 1);

        if (response.error.includes("Admin access only")) {
          notifications.show({
            title: "Access Denied",
            message: "Admin access only. Unauthorized user.",
            color: "red",
            icon: <IconAlertCircle />,
          });
        } else {
          
          notifications.show({
            title: "Login Failed",
            message: response.error,
            color: "red",
            icon: <IconAlertCircle />,
          });
        }

        if (failedAttempts >= 2) {
          setIsBlocked(true);
          setShowForgotPassword(true);
        }
      } else if (response.user) {
        notifications.show({
          title: "Login Successful",
          message: `Welcome back, ${response.user.name}!`,
          color: "green",
          icon: <IconCheck />,
        });

        // Redirect to admin dashboard
        navigate("/admin/dashboard");
        // Clear any lingering errors on success
        loginForm.setErrors({});
      }
    } catch (err) {
      console.error("Login error:", err);
      notifications.show({
        title: "Error",
        message: "An unexpected error occurred. Please try again.",
        color: "red",
        icon: <IconAlertCircle />,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (values: { email: string }) => {
    setIsLoading(true);

    try {
      const response = await authService.resetPassword(values);

      if (response.success) {
        notifications.show({
          title: "Reset Link Sent",
          message: response.message,
          color: "green",
          icon: <IconCheck />,
        });
        setShowForgotPassword(false);
      } else {
        notifications.show({
          title: "Reset Failed",
          message: response.message,
          color: "red",
          icon: <IconAlertCircle />,
        });
      }
    } catch (err) {
      console.error("Reset password error:", err);
      notifications.show({
        title: "Error",
        message: "Failed to send reset email. Please try again.",
        color: "red",
        icon: <IconAlertCircle />,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br flex items-center justify-center p-4">
      {/* Background Header */}
      <Box className="fixed top-0 left-0 right-0  z-10 shadow-lg">
        <Group p="sm" gap="md" bg={"blue.6"}>
          <img src={MedienteLogo} alt="Mediente Logo" className="h-8" />
        </Group>
      </Box>

     <Container size="xl" mt={80} className="w-full max-w-6xl"> 
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center min-h-[600px] w-full ">
          {/* Left side - Illustration/Image section */}
         
          <div>
            <div className="rounded-3xl p-8 text-center relative overflow-hidden ">
              <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
              <div className="relative z-10">
                <img
                  src={LandingImage}
                  alt="Movie production"
                  className="w-full max-h-96 object-cover rounded-2xl mx-auto mb-6 shadow-lg"
                  // style={{width:500}}
                />
               
              </div>
            </div>
          </div>

          {/* Right side - Login form */}
          <div>
            <Paper
              p="xl"
              radius="lg"
              maw={500}
              mih={500}
              mx="auto"
              className="relative bg-white/95 backdrop-blur-sm border border-white/20"
            >
              <LoadingOverlay visible={isLoading} />

              <Stack gap="lg">
                {/* Header */}
                <Box ta="center">
                  <Title order={1}  fw={700} c="dark.9" mb="xl">
                    <span className="text-blue-500">Welcome </span>to Mediente
                    <br />
                    <span className="text-gray-600 text-lg">Admin Dashboard 🚀</span>
                  </Title>
                </Box>

                {isBlocked && (
                  <Alert
                    icon={<IconAlertCircle />}
                    color="red"
                    title="Account Temporarily Blocked"
                  >
                    Too many failed attempts. Please reset your password.
                  </Alert>
                )}

                {!showForgotPassword ? (
                  /* Login Form */
                  <form onSubmit={loginForm.onSubmit(handleLogin)}>
                    <Stack gap="md">
                      <TextInput
                        placeholder="What is your e-mail?"
                        leftSection={<IconMail size={18} />}
                        {...loginForm.getInputProps("email")}
                        disabled={isLoading}
                        size="md"
                      />

                      <PasswordInput
                        placeholder="Enter your password"
                        leftSection={<IconLock size={18} />}
                        visibilityToggleIcon={({ reveal }) =>
                          reveal ? (
                            <IconEyeOff size={18} />
                          ) : (
                            <IconEye size={18} />
                          )
                        }
                        {...loginForm.getInputProps("password")}
                        disabled={isLoading}
                        size="md"
                      />

                      <Button
                        type="submit"
                        fullWidth
                        size="md"
                        disabled={isLoading || isBlocked}
                        loading={isLoading}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Continue
                      </Button>

                      <Group justify="center" mt="md">
                        <Text size="sm" c="dimmed">
                          Unable to Log in?{" "}
                          <Anchor
                            size="sm"
                            onClick={() => setShowForgotPassword(true)}
                            className="cursor-pointer text-blue-600 hover:text-blue-700"
                          >
                            Reset Password
                          </Anchor>
                        </Text>
                      </Group>
                    </Stack>
                  </form>
                ) : (
                  /* Reset Password Form */
                  <form onSubmit={resetForm.onSubmit(handleForgotPassword)}>
                    <Stack gap="md">
                      <Title order={3} ta="center" c="dark">
                        Reset Password
                      </Title>
                      <Text size="sm" c="dimmed" ta="center">
                        Enter your email address and we'll send you a reset link
                      </Text>

                      <TextInput
                        label="Email Address"
                        placeholder="Enter your email"
                        leftSection={<IconMail size={18} />}
                        {...resetForm.getInputProps("email")}
                        disabled={isLoading}
                        size="md"
                      />

                      <Group grow>
                        <Button
                          variant="outline"
                          onClick={() => setShowForgotPassword(false)}
                          disabled={isLoading}
                          size="md"
                        >
                          Back to Login
                        </Button>
                        <Button
                          type="submit"
                          disabled={isLoading}
                          loading={isLoading}
                          size="md"
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Send Reset Link
                        </Button>
                      </Group>
                    </Stack>
                  </form>
                )}
              </Stack>
            </Paper>
          </div>
        </div>
     </Container>
    </div>
  );
}
