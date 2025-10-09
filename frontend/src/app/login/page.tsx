"use client";

import {
  Box,
  Button,
  Flex,
  Input,
  Heading,
  Text,
  FormControl,
  FormLabel,
  VStack,
} from "@chakra-ui/react";
import { useState } from "react";
import axios from "axios";
import { apiUrl } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState(""); // changed from email
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await axios.post(apiUrl("/api/auth/login/"), {
        username,   // send username instead of email
        password,
      });

      const { token, role } = res.data;

      // Save token & role for later requests
      localStorage.setItem("token", token);
      localStorage.setItem("role", role);
      localStorage.setItem("username", username);

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (err) {
      setError("Invalid username or password");
    }
  };

  return (
    <Flex
      minH="100vh"
      align="center"
      justify="center"
      bgGradient="linear(to-br, brand.50, brand.100, brand.200)"
    >
      <Box
        bg="brand.100"
        p={10}
        borderRadius="2xl"
        boxShadow="lg"
        maxW="420px"
        w="full"
      >
        <VStack spacing={8} align="stretch">
          <Heading as="h2" textAlign="center" size="lg" color="brand.200">
            Digital Asset Manager
          </Heading>

          <form onSubmit={handleLogin}>
            <VStack spacing={5}>
              <FormControl isRequired>
                <FormLabel>Username</FormLabel>
                <Input
                  type="text" // changed from email
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  bg="white"
                  _focus={{ borderColor: "brand.200" }}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Password</FormLabel>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  bg="white"
                  _focus={{ borderColor: "brand.200" }}
                />
              </FormControl>

              {error && (
                <Text color="red.500" fontSize="sm">
                  {error}
                </Text>
              )}

              <Button
                type="submit"
                size="md"
                w="full"
                bg="brand.200"
                color="white"
                _hover={{ bg: "brand.300" }}
              >
                Login
              </Button>
            </VStack>
          </form>

          <Text fontSize="sm" textAlign="center" color="gray.600" mt={4}>
            © 2025 DAM System — All rights reserved.
          </Text>
        </VStack>
      </Box>
    </Flex>
  );
}
