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

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Logging in:", { email, password });
    // TODO: connect to Django API later
  };

  return (
    <Flex minH="100vh" align="center" justify="center" bg="brand.50">
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
                <FormLabel>Email</FormLabel>
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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