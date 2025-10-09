"use client";

import { useEffect, useState, Fragment } from "react";
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
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Input,
  FormControl,
  FormLabel,
  HStack,
} from "@chakra-ui/react";
import { DeleteIcon, ChevronLeftIcon, ChevronRightIcon } from "@chakra-ui/icons";
import Sidebar from "@/components/Sidebar";
import { apiUrl } from "@/lib/api";
import { useRouter } from "next/navigation";


interface User {
  id: number;
  username: string;
  email: string;
  role: 'Admin' | 'Editor' | 'Viewer';
}

export default function ManageUserPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]); // For search filtering
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [newUser, setNewUser] = useState({ 
    username: "", 
    email: "", 
    password: "", 
    role: "Viewer" as 'Admin' | 'Editor' | 'Viewer' 
  });
  const [creatingUser, setCreatingUser] = useState(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage, setUsersPerPage] = useState(10);

  const toast = useToast();
  const router = useRouter();

  // Calculate pagination
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = users.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(users.length / usersPerPage);

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
      
      const res = await fetch(apiUrl("/api/users/"), {
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
      setAllUsers(data); // Store all users for search filtering
      setCurrentPage(1); // Reset to first page on fetch
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      toast({
        title: "Error loading users",
        description: message,
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
      
      const res = await fetch(apiUrl(`/api/users/${userId}/`), {
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

      // Activity log feedback
      toast({
        title: "Action logged to Activity Log",
        status: "info",
        duration: 2000,
        isClosable: true,
      });
      
      // Optimistic update
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId ? { ...user, role: newRole as User['role'] } : user
        )
      );
      setAllUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId ? { ...user, role: newRole as User['role'] } : user
        )
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast({
        title: "Error updating role",
        description: message,
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
      
      const res = await fetch(apiUrl(`/api/users/${userId}/`), {
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

      // Activity log feedback
      toast({
        title: "Action logged to Activity Log",
        status: "info",
        duration: 2000,
        isClosable: true,
      });
      
      // Optimistic update
      const newUsers = users.filter(user => user.id !== userId);
      setUsers(newUsers);
      setAllUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
      
      // Adjust page if needed
      const newTotalPages = Math.ceil(newUsers.length / usersPerPage);
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast({
        title: "Error deleting user",
        description: message,
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

  // 🔹 Create new user
  const handleCreateUser = async () => {
    try {
      setCreatingUser(true);
      const token = getToken();
      
      const res = await fetch(apiUrl("/api/users/"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify(newUser),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create user");
      }
      
      toast({
        title: "User created successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      // Activity log feedback
      toast({
        title: "Action logged to Activity Log",
        status: "info",
        duration: 2000,
        isClosable: true,
      });
      
      setIsOpen(false);
      fetchUsers(); // Refresh the list
      setNewUser({ username: "", email: "", password: "", role: "Viewer" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast({
        title: "Error creating user",
        description: message,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setCreatingUser(false);
    }
  };

  // 🔹 Search/filter users
  const handleSearch = (query: string) => {
    if (!query.trim()) {
      setUsers(allUsers); // Reset to all users if search is empty
      setCurrentPage(1); // Reset to first page
      return;
    }
    
    const lowerQuery = query.toLowerCase();
    const filteredUsers = allUsers.filter(user => 
      user.username.toLowerCase().includes(lowerQuery) || 
      user.role.toLowerCase().includes(lowerQuery) ||
      user.email.toLowerCase().includes(lowerQuery)
    );
    setUsers(filteredUsers);
    setCurrentPage(1); // Reset to first page
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

  // Pagination handlers
  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
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
          <Flex gap={3}>
            <Button colorScheme="green" onClick={() => setIsOpen(true)}>
              + Add User
            </Button>
            <Button 
              colorScheme="blue" 
              onClick={fetchUsers}
              isLoading={loading && users.length > 0}
            >
              Refresh
            </Button>
          </Flex>
        </Flex>

        {/* Search Input and Items Per Page */}
        <Flex mb={4} gap={3} align="center" wrap="wrap">
          <Input
            placeholder="Search by username, email, or role..."
            maxW="300px"
            bg="white"
            onChange={(e) => handleSearch(e.target.value)}
          />
          <Flex align="center" gap={2}>
            <Text fontSize="sm" color="gray.600">Show:</Text>
            <Select
              value={usersPerPage}
              onChange={(e) => {
                setUsersPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              size="sm"
              width="80px"
              bg="white"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </Select>
            <Text fontSize="sm" color="gray.600">per page</Text>
          </Flex>
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
              <Text color="gray.500">
                {allUsers.length === 0 ? "No users found." : "No users match your search."}
              </Text>
            </Flex>
          ) : (
            <>
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
                  {currentUsers.map((user, index) => (
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

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <Flex justify="space-between" align="center" mt={6} flexWrap="wrap" gap={4}>
                  <Text fontSize="sm" color="gray.600">
                    Showing {indexOfFirstUser + 1} to {Math.min(indexOfLastUser, users.length)} of {users.length} users
                  </Text>
                  
                  <HStack spacing={2}>
                    <IconButton
                      aria-label="Previous page"
                      icon={<ChevronLeftIcon />}
                      onClick={goToPreviousPage}
                      isDisabled={currentPage === 1}
                      size="sm"
                      variant="outline"
                    />
                    
                    {/* Page numbers */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => {
                        // Show first page, last page, current page, and pages around current
                        return page === 1 || 
                              page === totalPages || 
                              (page >= currentPage - 1 && page <= currentPage + 1);
                      })
                      .map((page, index, array) => (
                        <Fragment key={page}>
                          {index > 0 && array[index - 1] !== page - 1 && (
                            <Text color="gray.400" px={1}>...</Text>
                          )}
                          <Button
                            size="sm"
                            onClick={() => goToPage(page)}
                            colorScheme={currentPage === page ? "blue" : "gray"}
                            variant={currentPage === page ? "solid" : "outline"}
                          >
                            {page}
                          </Button>
                        </Fragment>
                      ))}
                    
                    <IconButton
                      aria-label="Next page"
                      icon={<ChevronRightIcon />}
                      onClick={goToNextPage}
                      isDisabled={currentPage === totalPages}
                      size="sm"
                      variant="outline"
                    />
                  </HStack>
                </Flex>
              )}
            </>
          )}
        </Box>

        {/* Create User Modal */}
        <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Create New User</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <FormControl mb={3} isRequired>
                <FormLabel>Username</FormLabel>
                <Input 
                  value={newUser.username} 
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} 
                  placeholder="Enter username"
                />
              </FormControl>
              <FormControl mb={3} isRequired>
                <FormLabel>Email</FormLabel>
                <Input 
                  type="email"
                  value={newUser.email} 
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} 
                  placeholder="Enter email"
                />
              </FormControl>
              <FormControl mb={3} isRequired>
                <FormLabel>Password</FormLabel>
                <Input 
                  type="password" 
                  value={newUser.password} 
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} 
                  placeholder="Enter password"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Role</FormLabel>
                <Select 
                  value={newUser.role} 
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as 'Admin' | 'Editor' | 'Viewer' })}
                >
                  <option value="Admin">Admin</option>
                  <option value="Editor">Editor</option>
                  <option value="Viewer">Viewer</option>
                </Select>
              </FormControl>
            </ModalBody>
            <ModalFooter>
              <Button 
                colorScheme="blue" 
                mr={3} 
                onClick={handleCreateUser}
                isLoading={creatingUser}
                isDisabled={!newUser.username || !newUser.email || !newUser.password}
              >
                Create
              </Button>
              <Button 
                onClick={() => {
                  setIsOpen(false);
                  setNewUser({ username: "", email: "", password: "", role: "Viewer" });
                }}
                isDisabled={creatingUser}
              >
                Cancel
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Box>
    </Flex>
  );
}