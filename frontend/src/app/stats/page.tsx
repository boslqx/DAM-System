"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Grid,
  GridItem,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  VStack,
  HStack,
  Heading,
  Text,
  Image,
  Badge,
  Spinner,
  Flex,
  Icon,
  useColorModeValue,
} from "@chakra-ui/react";
import { FiFolder, FiHardDrive, FiStar, FiTrendingUp } from "react-icons/fi";
import Sidebar from "@/components/Sidebar";

interface DashboardStats {
  total_assets: number;
  total_size: number;
  total_size_mb: number;
  favorites_count: number;
  file_type_distribution: Array<{ file_type: string; count: number }>;
  category_distribution: Array<{ category: string; count: number }>;
  recent_uploads: Array<{
    id: number;
    name: string;
    file: string;
    file_type: string;
    created_at: string;
    file_size: number;
  }>;
}

export default function StatsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://127.0.0.1:8000/api/assets/stats/", {
        headers: {
          Authorization: `Token ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const getFullFileUrl = (fileUrl: string): string => {
    if (fileUrl.startsWith("http")) return fileUrl;
    return `http://127.0.0.1:8000${fileUrl}`;
  };

  const getFileTypeColor = (fileType: string) => {
    const colors: { [key: string]: string } = {
      IMG: "green",
      VID: "red",
      DOC: "blue",
      "3D": "purple",
      OTH: "gray",
    };
    return colors[fileType] || "gray";
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <Flex>
        <Sidebar />
        <Box flex="1" p={8} bg="brand.50" minH="100vh" ml={{ base: "0", md: "60px" }}>
          <Flex justify="center" align="center" minH="50vh">
            <Spinner size="xl" color="brand.200" />
          </Flex>
        </Box>
      </Flex>
    );
  }

  if (!stats) return null;

  return (
    <Flex>
      <Sidebar />

      {/* 👇 same background color and spacing as FavoritesPage */}
      <Box flex="1" p={8} bg="brand.50" minH="100vh" ml={{ base: "0", md: "60px" }}>
        <VStack spacing={6} align="stretch" mb={6}>
          {/* Header */}
          <Heading color="gray.700">Statistics Overview</Heading>
          <Text color="gray.600" fontSize="sm">
            A quick insight into your uploaded assets and user engagement.
          </Text>

          {/* Stats Cards */}
          <Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap={4}>
            <GridItem>
              <Box bg={bgColor} p={6} borderRadius="xl" boxShadow="sm" border="1px solid" borderColor={borderColor}>
                <HStack spacing={4}>
                  <Flex bg="blue.100" borderRadius="lg" p={3} color="blue.600">
                    <Icon as={FiFolder} boxSize={6} />
                  </Flex>
                  <Stat>
                    <StatLabel color="gray.600" fontSize="sm">Total Assets</StatLabel>
                    <StatNumber fontSize="2xl" fontWeight="bold">{stats.total_assets}</StatNumber>
                  </Stat>
                </HStack>
              </Box>
            </GridItem>

            <GridItem>
              <Box bg={bgColor} p={6} borderRadius="xl" boxShadow="sm" border="1px solid" borderColor={borderColor}>
                <HStack spacing={4}>
                  <Flex bg="purple.100" borderRadius="lg" p={3} color="purple.600">
                    <Icon as={FiHardDrive} boxSize={6} />
                  </Flex>
                  <Stat>
                    <StatLabel color="gray.600" fontSize="sm">Storage Used</StatLabel>
                    <StatNumber fontSize="2xl" fontWeight="bold">{stats.total_size_mb.toFixed(1)}</StatNumber>
                    <StatHelpText mb={0}>MB</StatHelpText>
                  </Stat>
                </HStack>
              </Box>
            </GridItem>

            <GridItem>
              <Box bg={bgColor} p={6} borderRadius="xl" boxShadow="sm" border="1px solid" borderColor={borderColor}>
                <HStack spacing={4}>
                  <Flex bg="yellow.100" borderRadius="lg" p={3} color="yellow.600">
                    <Icon as={FiStar} boxSize={6} />
                  </Flex>
                  <Stat>
                    <StatLabel color="gray.600" fontSize="sm">Favorites</StatLabel>
                    <StatNumber fontSize="2xl" fontWeight="bold">{stats.favorites_count}</StatNumber>
                  </Stat>
                </HStack>
              </Box>
            </GridItem>

            <GridItem>
              <Box bg={bgColor} p={6} borderRadius="xl" boxShadow="sm" border="1px solid" borderColor={borderColor}>
                <HStack spacing={4}>
                  <Flex bg="green.100" borderRadius="lg" p={3} color="green.600">
                    <Icon as={FiTrendingUp} boxSize={6} />
                  </Flex>
                  <Stat>
                    <StatLabel color="gray.600" fontSize="sm">File Types</StatLabel>
                    <StatNumber fontSize="2xl" fontWeight="bold">{stats.file_type_distribution.length}</StatNumber>
                  </Stat>
                </HStack>
              </Box>
            </GridItem>
          </Grid>

          {/* Recent Uploads */}
          <Box bg={bgColor} p={6} borderRadius="xl" boxShadow="sm" border="1px solid" borderColor={borderColor}>
            <Heading size="md" mb={4} color="gray.700">Recent Uploads</Heading>

            {stats.recent_uploads.length === 0 ? (
              <Flex justify="center" align="center" py={8}>
                <Text color="gray.500">No recent uploads</Text>
              </Flex>
            ) : (
              <VStack spacing={3} align="stretch">
                {stats.recent_uploads.map((asset) => (
                  <Box
                    key={asset.id}
                    p={4}
                    borderRadius="lg"
                    bg="gray.50"
                    _hover={{ bg: "brand.50", cursor: "pointer" }}
                    transition="background 0.2s"
                  >
                    <HStack spacing={4} justify="space-between">
                      <HStack spacing={4} flex={1}>
                        {asset.file_type === "IMG" ? (
                          <Image
                            src={getFullFileUrl(asset.file)}
                            alt={asset.name}
                            boxSize="50px"
                            objectFit="cover"
                            borderRadius="md"
                          />
                        ) : (
                          <Flex
                            boxSize="50px"
                            bg="gray.200"
                            borderRadius="md"
                            align="center"
                            justify="center"
                            fontSize="xl"
                          >
                            {asset.file_type === "VID" && "🎥"}
                            {asset.file_type === "DOC" && "📄"}
                            {asset.file_type === "3D" && "🎯"}
                            {asset.file_type === "OTH" && "📁"}
                          </Flex>
                        )}
                        <VStack align="start" spacing={1} flex={1}>
                          <Text fontWeight="medium" noOfLines={1}>{asset.name}</Text>
                          <HStack spacing={2}>
                            <Badge colorScheme={getFileTypeColor(asset.file_type)} variant="subtle" fontSize="xs">
                              {asset.file_type}
                            </Badge>
                            <Text fontSize="xs" color="gray.500">
                              {(asset.file_size / 1024 / 1024).toFixed(1)} MB
                            </Text>
                          </HStack>
                        </VStack>
                      </HStack>
                      <Text fontSize="xs" color="gray.500" whiteSpace="nowrap">
                        {formatTimeAgo(asset.created_at)}
                      </Text>
                    </HStack>
                  </Box>
                ))}
              </VStack>
            )}
          </Box>

          {/* File Type & Category Distribution */}
          <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
            {/* File Types */}
            <Box bg={bgColor} p={6} borderRadius="xl" boxShadow="sm" border="1px solid" borderColor={borderColor}>
              <Heading size="sm" mb={4} color="gray.700">File Types</Heading>
              <VStack align="stretch" spacing={2}>
                {stats.file_type_distribution.map((item) => (
                  <HStack key={item.file_type} justify="space-between">
                    <HStack>
                      <Badge colorScheme={getFileTypeColor(item.file_type)} variant="subtle">
                        {item.file_type}
                      </Badge>
                      <Text fontSize="sm" color="gray.600">
                        {item.count} {item.count === 1 ? "file" : "files"}
                      </Text>
                    </HStack>
                    <Text fontSize="sm" fontWeight="medium" color="gray.700">
                      {((item.count / stats.total_assets) * 100).toFixed(0)}%
                    </Text>
                  </HStack>
                ))}
              </VStack>
            </Box>

            {/* Categories */}
            <Box bg={bgColor} p={6} borderRadius="xl" boxShadow="sm" border="1px solid" borderColor={borderColor}>
              <Heading size="sm" mb={4} color="gray.700">Top Categories</Heading>
              <VStack align="stretch" spacing={2}>
                {stats.category_distribution.length === 0 ? (
                  <Text fontSize="sm" color="gray.500">No categories yet</Text>
                ) : (
                  stats.category_distribution.map((item) => (
                    <HStack key={item.category} justify="space-between">
                      <Text fontSize="sm" color="gray.600" noOfLines={1}>
                        {item.category}
                      </Text>
                      <HStack>
                        <Text fontSize="sm" color="gray.600">{item.count}</Text>
                        <Text fontSize="sm" fontWeight="medium" color="gray.700">
                          {((item.count / stats.total_assets) * 100).toFixed(0)}%
                        </Text>
                      </HStack>
                    </HStack>
                  ))
                )}
              </VStack>
            </Box>
          </Grid>
        </VStack>
      </Box>
    </Flex>
  );
}
