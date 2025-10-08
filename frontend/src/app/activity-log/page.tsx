"use client";

import { useEffect, useState, Fragment } from "react"; // Added Fragment import
import {
  Box,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Input,
  Select,
  Button,
  HStack,
  Spinner,
  Alert,
  AlertIcon,
  Badge,
  Flex,
  Text,
  Tooltip,
  IconButton,
} from "@chakra-ui/react";
import Sidebar from "@/components/Sidebar";
import { DownloadIcon, ChevronLeftIcon, ChevronRightIcon } from "@chakra-ui/icons";

interface ActivityLog {
  id: number;
  username: string;
  action_type: string;
  description: string;
  ip_address: string;
  timestamp: string;
}

interface PaginationInfo {
  count: number;
  next: string | null;
  previous: string | null;
  current_page: number;
  total_pages: number;
}

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    search: "",
    action_type: "",
    start_date: "",
    end_date: "",
  });
  const [pagination, setPagination] = useState<PaginationInfo>({
    count: 0,
    next: null,
    previous: null,
    current_page: 1,
    total_pages: 1,
  });

  // Step 1: Add Pagination State Variables
  const [currentPage, setCurrentPage] = useState(1);
  const [logsPerPage, setLogsPerPage] = useState(10);

  // Step 2: Add Pagination Calculations
  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = logs.slice(indexOfFirstLog, indexOfLastLog);
  const totalPages = Math.ceil(logs.length / logsPerPage);

  const getToken = (): string | null => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("token");
    }
    return null;
  };

  const fetchLogs = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);
      const token = getToken();
      
      // Build query parameters
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.action_type) params.append('action_type', filters.action_type);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      params.append('page', page.toString());
      params.append('page_size', '20'); // You can adjust page size as needed
      
      const queryString = params.toString();
      const url = `http://127.0.0.1:8000/api/activity/logs/${queryString ? `?${queryString}` : ''}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Token ${token}`,
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          setError("Unauthorized - Please login again");
          return;
        }
        if (res.status === 403) {
          setError("Access denied - Admin privileges required");
          return;
        }
        throw new Error(`Failed to fetch logs: ${res.status}`);
      }

      const data = await res.json();
      
      // Step 5: Update fetchLogs to Reset Page
      setCurrentPage(1); // Reset to first page on fetch
      
      // Assuming your API returns pagination info along with results
      // Adjust this based on your actual API response structure
      if (data.results && data.pagination) {
        // If your API uses 'results' for data and 'pagination' for metadata
        setLogs(data.results);
        setPagination(data.pagination);
      } else if (data.results && data.count !== undefined) {
        // If your API uses Django REST framework style pagination
        setLogs(data.results);
        setPagination({
          count: data.count,
          next: data.next,
          previous: data.previous,
          current_page: page,
          total_pages: Math.ceil(data.count / 20), // Adjust based on your page_size
        });
      } else {
        // If no pagination, assume it's all results
        setLogs(data);
        setPagination({
          count: data.length,
          next: null,
          previous: null,
          current_page: 1,
          total_pages: 1,
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, []);

  const getActionColor = (action: string) => {
    switch (action) {
      case 'login': return 'green';
      case 'logout': return 'orange';
      case 'delete': return 'red';
      case 'update': return 'blue';
      case 'add': return 'teal';
      case 'view': return 'purple';
      default: return 'gray';
    }
  };

  // ✅ Export to CSV function - exports ALL data, not just current page
  const exportToCSV = async () => {
    try {
      const token = getToken();
      
      // Build query parameters for ALL data (no pagination)
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.action_type) params.append('action_type', filters.action_type);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      params.append('page_size', '10000'); // Large number to get all data
      
      const queryString = params.toString();
      const url = `http://127.0.0.1:8000/api/activity/logs/${queryString ? `?${queryString}` : ''}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Token ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to export logs: ${res.status}`);
      }

      const data = await res.json();
      const exportLogs = data.results || data; // Handle both paginated and non-paginated responses

      if (exportLogs.length === 0) {
        alert('No data to export');
        return;
      }

      const headers = ['Timestamp', 'User', 'Action', 'Description', 'IP Address'];
      const csvData = exportLogs.map((log: ActivityLog) => [
        new Date(log.timestamp).toLocaleString(),
        log.username,
        log.action_type,
        log.description,
        log.ip_address || 'N/A'
      ]);

      const csvContent = [
        headers.join(','),
        ...csvData.map((row: string[]) => row.map(field => `"${field}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const urlObj = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = urlObj;
      a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(urlObj);
    } catch (err: any) {
      setError(`Export failed: ${err.message}`);
    }
  };

  // ✅ Clear all filters
  const clearAllFilters = () => {
    setFilters({
      search: "",
      action_type: "",
      start_date: "",
      end_date: "",
    });
    setCurrentPage(1); // Add this
    setTimeout(() => fetchLogs(1), 100);
  };

  // ✅ Apply filters
  const applyFilters = () => {
    setCurrentPage(1); // Add this
    fetchLogs(1);
  };

  // Step 4: Add Pagination Handlers
  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // ✅ Server-side pagination handlers (keep your existing ones)
  const goToServerPage = (page: number) => {
    if (page >= 1 && page <= pagination.total_pages) {
      fetchLogs(page);
    }
  };

  // ✅ Generate page numbers for server-side pagination (keep your existing ones)
  const getPageNumbers = () => {
    const current = pagination.current_page;
    const total = pagination.total_pages;
    const delta = 2; // Number of pages to show on each side of current page
    const range = [];
    const rangeWithDots = [];

    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
        range.push(i);
      }
    }

    let prev = 0;
    for (const i of range) {
      if (prev !== 0 && i - prev !== 1) {
        rangeWithDots.push('...');
      }
      rangeWithDots.push(i);
      prev = i;
    }

    return rangeWithDots;
  };

  return (
    <Flex>
      <Sidebar />
      
      <Box flex="1" p={8} ml={{ base: "0", md: "60px" }} bg="brand.50" minH="100vh">
        <Flex justify="space-between" align="center" mb={6}>
          <Heading size="lg" color="gray.700">
            System Activity Log
          </Heading>
          <Tooltip label="Export to CSV" hasArrow>
            <IconButton
              aria-label="Export logs"
              icon={<DownloadIcon />}
              colorScheme="blue"
              variant="outline"
              onClick={exportToCSV}
              isDisabled={pagination.count === 0}
            />
          </Tooltip>
        </Flex>

        {/* ✅ Compact Filter Row */}
        <Flex direction="column" mb={6}>
          <HStack spacing={4} mb={3} flexWrap="wrap" align="flex-end">
            {/* Search Input */}
            <Box>
              <Text fontSize="sm" mb={1} color="gray.600" fontWeight="medium">Search</Text>
              <Input
                placeholder="Username or description..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                width="200px"
                bg="white"
              />
            </Box>

            {/* Action Filter */}
            <Box>
              <Text fontSize="sm" mb={1} color="gray.600" fontWeight="medium">Action Type</Text>
              <Select
                placeholder="All actions"
                value={filters.action_type}
                onChange={(e) => setFilters({ ...filters, action_type: e.target.value })}
                width="180px"
                bg="white"
              >
                <option value="login">Login</option>
                <option value="logout">Logout</option>
                <option value="add">Add</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
                <option value="view">View</option>
              </Select>
            </Box>

            {/* Start Date */}
            <Box>
              <Text fontSize="sm" mb={1} color="gray.600" fontWeight="medium">Start Date</Text>
              <Input
                type="date"
                value={filters.start_date}
                onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                width="160px"
                bg="white"
              />
            </Box>

            {/* End Date */}
            <Box>
              <Text fontSize="sm" mb={1} color="gray.600" fontWeight="medium">End Date</Text>
              <Input
                type="date"
                value={filters.end_date}
                onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                width="160px"
                bg="white"
              />
            </Box>

            {/* Step 8: Add Items Per Page Selector */}
            <Box>
              <Text fontSize="sm" mb={1} color="gray.600" fontWeight="medium">Show</Text>
              <Select
                value={logsPerPage}
                onChange={(e) => {
                  setLogsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                width="100px"
                bg="white"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </Select>
            </Box>

            {/* Buttons */}
            <HStack spacing={2}>
              <Button colorScheme="blue" onClick={applyFilters} height="40px">
                Apply Filters
              </Button>
              <Button colorScheme="green" onClick={clearAllFilters} height="40px">
                Clear All
              </Button>
            </HStack>
          </HStack>

          {/* Active filters hint */}
          {(filters.search || filters.action_type || filters.start_date || filters.end_date) && (
            <Text fontSize="sm" color="blue.600" fontStyle="italic">
              Active filters: 
              {filters.search && ` Search: "${filters.search}"`}
              {filters.action_type && ` Action: ${filters.action_type}`}
              {filters.start_date && ` From: ${filters.start_date}`}
              {filters.end_date && ` To: ${filters.end_date}`}
            </Text>
          )}
        </Flex>

        {error && (
          <Alert status="error" mb={4} borderRadius="md">
            <AlertIcon />
            {error}
          </Alert>
        )}

        {/* Step 8: Update Results Summary */}
        {!loading && (
          <Text color="gray.600" mb={4}>
            Showing {indexOfFirstLog + 1} to {Math.min(indexOfLastLog, logs.length)} of {logs.length} log entries
            {filters.start_date && ` from ${filters.start_date}`}
            {filters.end_date && ` to ${filters.end_date}`}
            {totalPages > 1 && ` (Page ${currentPage} of ${totalPages})`}
          </Text>
        )}

        <Box bg="white" p={6} borderRadius="xl" boxShadow="sm" border="1px solid" borderColor="gray.200">
          {loading ? (
            <Flex justify="center" align="center" py={8}>
              <Spinner size="xl" color="blue.500" />
            </Flex>
          ) : logs.length === 0 ? (
            <Flex justify="center" align="center" py={8} direction="column" gap={3}>
              <Text color="gray.500">No activity logs found.</Text>
              {(filters.search || filters.action_type || filters.start_date || filters.end_date) && (
                <Button colorScheme="blue" variant="ghost" size="sm" onClick={clearAllFilters}>
                  Clear filters to see all logs
                </Button>
              )}
            </Flex>
          ) : (
            <>
              <Table variant="simple" size="md">
                <Thead bg="brand.200">
                  <Tr>
                    <Th color="white">Timestamp</Th>
                    <Th color="white">User</Th>
                    <Th color="white">Action</Th>
                    <Th color="white">Description</Th>
                    <Th color="white">IP Address</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {/* Step 9: Update Table to Use currentLogs */}
                  {currentLogs.map((log, index) => (
                    <Tr 
                      key={log.id} 
                      bg={index % 2 === 0 ? "white" : "gray.50"}
                      _hover={{ bg: "brand.100", transition: "background 0.2s" }}
                    >
                      <Td fontWeight="medium" color="gray.600">
                        {new Date(log.timestamp).toLocaleString()}
                      </Td>
                      <Td fontWeight="medium" color="gray.800">{log.username}</Td>
                      <Td>
                        <Badge 
                          colorScheme={getActionColor(log.action_type)}
                          variant="subtle"
                          px={2}
                          py={1}
                          borderRadius="md"
                          textTransform="capitalize"
                        >
                          {log.action_type}
                        </Badge>
                      </Td>
                      <Td color="gray.600">{log.description}</Td>
                      <Td color="gray.500" fontFamily="monospace">
                        {log.ip_address || "N/A"}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>

              {/* Step 10: Add Client-side Pagination Controls */}
              {totalPages > 1 && (
                <Flex justify="space-between" align="center" mt={6} flexWrap="wrap" gap={4}>
                  <Text fontSize="sm" color="gray.600">
                    Showing {indexOfFirstLog + 1} to {Math.min(indexOfLastLog, logs.length)} of {logs.length} logs
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
                            minW="40px"
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

              {/* Keep your existing server-side pagination for reference */}
              {/* You can remove this if you don't need both */}
              {pagination.total_pages > 1 && (
                <Flex justify="center" align="center" mt={4} gap={2}>
                  <Text fontSize="sm" color="gray.500" mb={2}>
                    Server-side pagination (API): Page {pagination.current_page} of {pagination.total_pages}
                  </Text>
                </Flex>
              )}
            </>
          )}
        </Box>
      </Box>
    </Flex>
  );
}