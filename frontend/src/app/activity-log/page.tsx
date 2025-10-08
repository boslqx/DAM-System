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
  Grid,
  GridItem,
  Card,
  CardHeader,
  CardBody,
} from "@chakra-ui/react";
import Sidebar from "@/components/Sidebar";
import { DownloadIcon, ChevronLeftIcon, ChevronRightIcon } from "@chakra-ui/icons";

// Chart.js imports
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartTooltip,
  Legend
);

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

  // Pagination State Variables
  const [currentPage, setCurrentPage] = useState(1);
  const [logsPerPage, setLogsPerPage] = useState(10);

  // Pagination Calculations
  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = logs.slice(indexOfFirstLog, indexOfLastLog);
  const totalPages = Math.ceil(logs.length / logsPerPage);

  // Chart data state
  const [chartData, setChartData] = useState<any>(null);

  const getToken = (): string | null => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("token");
    }
    return null;
  };

  // Function to process data for chart
  const processChartData = (logs: ActivityLog[]) => {
    const actionCounts: { [key: string]: number } = {};
    
    // Count occurrences of each action type
    logs.forEach(log => {
      const action = log.action_type || 'unknown';
      actionCounts[action] = (actionCounts[action] || 0) + 1;
    });

    // Sort by count (descending)
    const sortedActions = Object.entries(actionCounts)
      .sort(([, a], [, b]) => b - a)
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {} as { [key: string]: number });

    const actions = Object.keys(sortedActions);
    const counts = Object.values(sortedActions);

    // Generate colors based on action type
    const backgroundColors = actions.map(action => {
      const color = getActionColor(action);
      return getColorValue(color);
    });

    const borderColors = actions.map(action => {
      const color = getActionColor(action);
      return getBorderColorValue(color);
    });

    return {
      labels: actions,
      datasets: [
        {
          label: 'Number of Actions',
          data: counts,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    };
  };

  // Helper function to convert Chakra UI color names to hex values
  const getColorValue = (color: string): string => {
    const colorMap: { [key: string]: string } = {
      green: 'rgba(72, 187, 120, 0.7)',
      orange: 'rgba(237, 137, 54, 0.7)',
      red: 'rgba(245, 101, 101, 0.7)',
      blue: 'rgba(66, 153, 225, 0.7)',
      teal: 'rgba(56, 178, 172, 0.7)',
      purple: 'rgba(159, 122, 234, 0.7)',
      gray: 'rgba(160, 174, 192, 0.7)',
    };
    return colorMap[color] || 'rgba(160, 174, 192, 0.7)';
  };

  const getBorderColorValue = (color: string): string => {
    const colorMap: { [key: string]: string } = {
      green: 'rgb(72, 187, 120)',
      orange: 'rgb(237, 137, 54)',
      red: 'rgb(245, 101, 101)',
      blue: 'rgb(66, 153, 225)',
      teal: 'rgb(56, 178, 172)',
      purple: 'rgb(159, 122, 234)',
      gray: 'rgb(160, 174, 192)',
    };
    return colorMap[color] || 'rgb(160, 174, 192)';
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
      params.append('page_size', '20');
      
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
      
      setCurrentPage(1);
      
      let logsData: ActivityLog[] = [];
      if (data.results && data.pagination) {
        logsData = data.results;
        setLogs(data.results);
        setPagination(data.pagination);
      } else if (data.results && data.count !== undefined) {
        logsData = data.results;
        setLogs(data.results);
        setPagination({
          count: data.count,
          next: data.next,
          previous: data.previous,
          current_page: page,
          total_pages: Math.ceil(data.count / 20),
        });
      } else {
        logsData = data;
        setLogs(data);
        setPagination({
          count: data.length,
          next: null,
          previous: null,
          current_page: 1,
          total_pages: 1,
        });
      }

      // Process chart data after setting logs
      setChartData(processChartData(logsData));
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

  // Chart options
  const chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Activity Log Distribution by Action Type',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.y}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of Actions'
        },
        ticks: {
          stepSize: 1
        }
      },
      x: {
        title: {
          display: true,
          text: 'Action Types'
        }
      }
    },
  };

  // Export to CSV function
  const exportToCSV = async () => {
    try {
      const token = getToken();
      
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.action_type) params.append('action_type', filters.action_type);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      params.append('page_size', '10000');
      
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
      const exportLogs = data.results || data;

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

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({
      search: "",
      action_type: "",
      start_date: "",
      end_date: "",
    });
    setCurrentPage(1);
    setTimeout(() => fetchLogs(1), 100);
  };

  // Apply filters
  const applyFilters = () => {
    setCurrentPage(1);
    fetchLogs(1);
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

        {/* Compact Filter Row */}
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

            {/* Items Per Page Selector */}
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

        {/* Results Summary */}
        {!loading && (
          <Text color="gray.600" mb={4}>
            Showing {indexOfFirstLog + 1} to {Math.min(indexOfLastLog, logs.length)} of {logs.length} log entries
            {filters.start_date && ` from ${filters.start_date}`}
            {filters.end_date && ` to ${filters.end_date}`}
            {totalPages > 1 && ` (Page ${currentPage} of ${totalPages})`}
          </Text>
        )}

        {/* Chart Visualization */}
        {!loading && chartData && logs.length > 0 && (
          <Card mb={6} bg="white" borderRadius="xl" boxShadow="sm" border="1px solid" borderColor="gray.200">
            <CardHeader pb={2}>
              <Heading size="md">Activity Distribution</Heading>
            </CardHeader>
            <CardBody pt={0}>
              <Box height="300px">
                <Bar data={chartData} options={chartOptions} />
              </Box>
            </CardBody>
          </Card>
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

              {/* Pagination Controls */}
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
            </>
          )}
        </Box>
      </Box>
    </Flex>
  );
}