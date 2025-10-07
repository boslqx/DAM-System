"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  Spinner,
  useToast,
  Select,
  Flex,
  Alert,
  AlertIcon,
  Text,
  Badge,
  IconButton,
  Tooltip,
} from "@chakra-ui/react";
import { DeleteIcon, EditIcon } from "@chakra-ui/icons";
import Sidebar from "@/components/Sidebar";
import { useRouter } from "next/navigation";

interface User {
  id: number;
  username: string;
  email: string;
  role: 'Admin' | 'Editor' | 'Viewer';
}

export default function ManageUserPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  
  const toast = useToast();
  const router = useRouter();

  // 🔹 Safe token retrieval
  const getToken = (): string | null => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("token");
    }
    return null;
  };

  // 🔹 Enhanced auth check
  useEffect(() => {
    const token = getToken();
    const storedRole = localStorage.getItem("role");
    
    if (!token || !storedRole) {
      router.push("/login");
      return;
    }
    
    // Optional: Check if user has admin privileges
    if (storedRole !== 'Admin') {
      toast({
        title: "Access Denied",
        description: "You need admin privileges to access this page.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      router.push("/dashboard");
    }
  }, [router, toast]);

  // 🔹 Enhanced fetch users with abort controller
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getToken();
      
      const res = await fetch("http://127.0.0.1:8000/api/users/", {
        headers: {
          Authorization: `Token ${token}`,
        },
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("role");
          router.push("/login");
          return;
        }
        throw new Error(`Failed to fetch users: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Error loading users",
        description: err.message,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // 🔹 Enhanced role update with loading state
  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      setUpdatingUserId(userId);
      const token = getToken();
      
      const res = await fetch(`http://127.0.0.1:8000/api/users/${userId}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      
      if (!res.ok) throw new Error("Failed to update role");
      
      toast({
        title: "Role updated successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      
      // Optimistic update
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId ? { ...user, role: newRole as User['role'] } : user
        )
      );
    } catch (err: any) {
      toast({
        title: "Error updating role",
        description: err.message,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
      // Revert optimistic update by refetching
      fetchUsers();
    } finally {
      setUpdatingUserId(null);
    }
  };

  // 🔹 Enhanced delete with confirmation modal simulation
  const handleDelete = async (userId: number) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;

    try {
      setDeletingUserId(userId);
      const token = getToken();
      
      const res = await fetch(`http://127.0.0.1:8000/api/users/${userId}/`, {
        method: "DELETE",
        headers: { Authorization: `Token ${token}` },
      });
      
      if (!res.ok) throw new Error("Failed to delete user");
      
      toast({
        title: "User deleted successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      
      // Optimistic update
      setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
    } catch (err: any) {
      toast({
        title: "Error deleting user",
        description: err.message,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
      // Revert optimistic update by refetching
      fetchUsers();
    } finally {
      setDeletingUserId(null);
    }
  };

  // 🔹 Role color mapping
  const getRoleColor = (role: User['role']) => {
    switch (role) {
      case 'Admin': return 'red';
      case 'Editor': return 'blue';
      case 'Viewer': return 'green';
      default: return 'gray';
    }
  };

  // 🔹 Enhanced loading state
  if (loading && users.length === 0) {
    return (
      <Flex justify="center" align="center" minH="100vh" direction="column" gap={4}>
        <Spinner size="xl" color="blue.500" thickness="4px" />
        <Text color="gray.600">Loading users...</Text>
      </Flex>
    );
  }

  return (
    <Flex>
      <Sidebar />

      <Box
        flex="1"
        p={8}
        bg="brand.50"
        minH="100vh"
        ml={{ base: "0", md: "60px" }}
        transition="margin 0.3s ease"
      >
        <Flex justify="space-between" align="center" mb={6}>
          <Heading color="gray.700">User Management</Heading>
          <Button 
            colorScheme="blue" 
            onClick={fetchUsers}
            isLoading={loading && users.length > 0}
          >
            Refresh
          </Button>
        </Flex>

        {error && (
          <Alert status="error" mb={4} borderRadius="md">
            <AlertIcon />
            {error}
          </Alert>
        )}

        <Box
          bg="white"
          p={6}
          borderRadius="xl"
          boxShadow="sm"
          border="1px solid"
          borderColor="gray.200"
        >
          {users.length === 0 && !loading ? (
            <Flex justify="center" align="center" py={8}>
              <Text color="gray.500">No users found.</Text>
            </Flex>
          ) : (
            <Table variant="simple" size="md">
              <Thead bg="brand.200">
                <Tr>
                  <Th color="white" fontSize="sm" fontWeight="bold">ID</Th>
                  <Th color="white" fontSize="sm" fontWeight="bold">Username</Th>
                  <Th color="white" fontSize="sm" fontWeight="bold">Email</Th>
                  <Th color="white" fontSize="sm" fontWeight="bold">Role</Th>
                  <Th color="white" fontSize="sm" fontWeight="bold" textAlign="center">Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {users.map((user, index) => (
                  <Tr 
                    key={user.id} 
                    bg={index % 2 === 0 ? "white" : "gray.50"}
                    _hover={{ bg: "brand.100", transition: "background 0.2s" }}
                  >
                    <Td fontWeight="medium" color="gray.600">{user.id}</Td>
                    <Td fontWeight="medium" color="gray.800">{user.username}</Td>
                    <Td color="gray.600">{user.email}</Td>
                    <Td>
                      <Flex align="center" gap={2}>
                        <Badge 
                          colorScheme={getRoleColor(user.role)}
                          variant="subtle"
                          px={2}
                          py={1}
                          borderRadius="md"
                        >
                          {user.role}
                        </Badge>
                        <Select
                          size="xs"
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          bg="white"
                          borderColor="gray.300"
                          width="100px"
                          isDisabled={updatingUserId === user.id}
                          _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px blue.500" }}
                        >
                          <option value="Admin">Admin</option>
                          <option value="Editor">Editor</option>
                          <option value="Viewer">Viewer</option>
                        </Select>
                        {updatingUserId === user.id && (
                          <Spinner size="sm" color="blue.500" />
                        )}
                      </Flex>
                    </Td>
                    <Td textAlign="center">
                      <Tooltip label="Delete user" hasArrow>
                        <IconButton
                          aria-label="Delete user"
                          icon={<DeleteIcon />}
                          size="sm"
                          colorScheme="red"
                          variant="ghost"
                          onClick={() => handleDelete(user.id)}
                          isLoading={deletingUserId === user.id}
                          isDisabled={deletingUserId !== null}
                        />
                      </Tooltip>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Box>
      </Box>
    </Flex>
  );
}