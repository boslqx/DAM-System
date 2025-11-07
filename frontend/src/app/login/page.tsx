"use client";

import {
  Box,
  Button,
  Flex,
  Input,
  Image,
  Text,
  FormControl,
  FormLabel,
  VStack,
  InputGroup,
  InputRightElement,
  IconButton,
} from "@chakra-ui/react";
import { useState } from "react";
import { ViewIcon, ViewOffIcon } from "@chakra-ui/icons";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/auth/login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        throw new Error("Invalid credentials");
      }

      const data = await res.json();
      const { token, role } = data;

      // Save to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("token", token);
        localStorage.setItem("role", role);
        localStorage.setItem("username", username);
        
        // Redirect to dashboard
        window.location.href = "/dashboard";
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  return (
    <Flex
      minH="100vh"
      align="center"
      justify="center"
      bgGradient="linear(to-br, brand.50, brand.100, brand.200)"
      position="relative"
    >
      {/* Animated Background Elements */}
      <Box
        position="absolute"
        top="-10%"
        right="-5%"
        w="500px"
        h="500px"
        borderRadius="full"
        bgGradient="linear(to-br, brand.200, brand.300)"
        opacity="0.1"
        filter="blur(80px)"
        zIndex="0"
      />
      <Box
        position="absolute"
        bottom="-10%"
        left="-5%"
        w="400px"
        h="400px"
        borderRadius="full"
        bgGradient="linear(to-tr, blue.200, purple.200)"
        opacity="0.1"
        filter="blur(80px)"
        zIndex="0"
      />

      <Box
        bg="white"
        p={10}
        borderRadius="2xl"
        boxShadow="2xl"
        maxW="420px"
        w="full"
        position="relative"
        zIndex="1"
        border="1px solid"
        borderColor="gray.100"
      >
        <VStack spacing={8} align="stretch">
          {/* Logo */}
          <Flex justify="center" mb={2}>
            <Image 
              src="http://127.0.0.1:8000/media/logo/Assetflow_transparent.png" 
              alt="AssetFlow Logo" 
              h="150px"
              w="150px"
              objectFit="contain"
            />
          </Flex>

          <VStack spacing={5}>
            <FormControl isRequired>
              <FormLabel color="gray.700" fontWeight="semibold">Username</FormLabel>
              <Input
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={handleSubmit}
                bg="gray.50"
                border="1px solid"
                borderColor="gray.200"
                _hover={{ borderColor: "brand.200", bg: "white" }}
                _focus={{ 
                  borderColor: "brand.200", 
                  bg: "white",
                  boxShadow: "0 0 0 1px var(--chakra-colors-brand-200)" 
                }}
                size="lg"
                borderRadius="xl"
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel color="gray.700" fontWeight="semibold">Password</FormLabel>
              <InputGroup size="lg">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleSubmit}
                  bg="gray.50"
                  border="1px solid"
                  borderColor="gray.200"
                  _hover={{ borderColor: "brand.200", bg: "white" }}
                  _focus={{ 
                    borderColor: "brand.200", 
                    bg: "white",
                    boxShadow: "0 0 0 1px var(--chakra-colors-brand-200)" 
                  }}
                  borderRadius="xl"
                />
                <InputRightElement>
                  <IconButton
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                    onClick={() => setShowPassword(!showPassword)}
                    variant="ghost"
                    size="sm"
                    _hover={{ bg: "transparent" }}
                  />
                </InputRightElement>
              </InputGroup>
            </FormControl>

            {error && (
              <Box 
                bg="red.50" 
                p={3} 
                borderRadius="lg" 
                border="1px solid" 
                borderColor="red.200"
                w="full"
              >
                <Text color="red.600" fontSize="sm" fontWeight="medium">
                  {error}
                </Text>
              </Box>
            )}

            <Button
              onClick={handleLogin}
              size="lg"
              w="full"
              bgGradient="linear(to-r, brand.200, purple.500)"
              color="white"
              _hover={{ 
                bgGradient: "linear(to-r, brand.300, purple.600)",
                transform: "translateY(-2px)",
                boxShadow: "xl"
              }}
              _active={{
                transform: "translateY(0)",
              }}
              borderRadius="xl"
              fontWeight="bold"
              transition="all 0.2s"
              isLoading={loading}
              loadingText="Signing in..."
            >
              Sign In
            </Button>
          </VStack>

          <Text fontSize="xs" textAlign="center" color="gray.500" mt={4}>
            © 2025 AssetFlow – All rights reserved.
          </Text>
        </VStack>
      </Box>
    </Flex>
  );
}