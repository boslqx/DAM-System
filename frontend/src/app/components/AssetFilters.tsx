"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Input,
  Select,
  Button,
  HStack,
  Text,
  Flex,
  Wrap,
  WrapItem,
  Tag,
  TagLabel,
  TagCloseButton,
  Collapse,
  IconButton,
} from "@chakra-ui/react";
import { ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";

interface AssetFiltersProps {
  onFiltersChange: (filters: any) => void;
  availableCategories: string[];
  availableTags: string[];
}

export default function AssetFilters({ 
  onFiltersChange, 
  availableCategories, 
  availableTags 
}: AssetFiltersProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [fileType, setFileType] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const fileTypes = [
    { value: "IMG", label: "Images" },
    { value: "VID", label: "Videos" },
    { value: "DOC", label: "Documents" },
    { value: "3D", label: "3D Models" },
    { value: "OTH", label: "Other" },
  ];

  useEffect(() => {
    const filters = {
      search,
      category,
      file_type: fileType,
      tags: selectedTags.join(","),
      date_from: dateFrom,
      date_to: dateTo,
    };
    onFiltersChange(filters);
  }, [search, category, fileType, selectedTags, dateFrom, dateTo, onFiltersChange]);

  const addTag = (tag: string) => {
    if (!selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setSelectedTags(selectedTags.filter(tag => tag !== tagToRemove));
  };

  const clearAll = () => {
    setSearch("");
    setCategory("");
    setFileType("");
    setSelectedTags([]);
    setDateFrom("");
    setDateTo("");
  };

  return (
    <Box bg="white" p={4} borderRadius="xl" boxShadow="sm" border="1px solid" borderColor="gray.200" mb={6}>
      {/* Basic Filters */}
      <Flex gap={4} mb={3} flexWrap="wrap">
        <Box flex="1" minW="200px">
          <Text fontSize="sm" mb={1} color="gray.600" fontWeight="medium">Search</Text>
          <Input
            placeholder="Search assets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            bg="white"
          />
        </Box>
        
        <Box minW="180px">
          <Text fontSize="sm" mb={1} color="gray.600" fontWeight="medium">Category</Text>
          <Select
            placeholder="All categories"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            bg="white"
          >
            {availableCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </Select>
        </Box>
        
        <Box minW="150px">
          <Text fontSize="sm" mb={1} color="gray.600" fontWeight="medium">File Type</Text>
          <Select
            placeholder="All types"
            value={fileType}
            onChange={(e) => setFileType(e.target.value)}
            bg="white"
          >
            {fileTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </Select>
        </Box>

        <Flex align="flex-end">
          <IconButton
            aria-label="Advanced filters"
            icon={showAdvanced ? <ChevronUpIcon /> : <ChevronDownIcon />}
            onClick={() => setShowAdvanced(!showAdvanced)}
            variant="ghost"
          />
        </Flex>
      </Flex>

      {/* Selected Tags */}
      {selectedTags.length > 0 && (
        <Wrap mb={3}>
          {selectedTags.map(tag => (
            <WrapItem key={tag}>
              <Tag size="md" colorScheme="blue" borderRadius="full">
                <TagLabel>{tag}</TagLabel>
                <TagCloseButton onClick={() => removeTag(tag)} />
              </Tag>
            </WrapItem>
          ))}
        </Wrap>
      )}

      {/* Advanced Filters */}
      <Collapse in={showAdvanced}>
        <Flex gap={4} mb={3} flexWrap="wrap">
          <Box minW="150px">
            <Text fontSize="sm" mb={1} color="gray.600" fontWeight="medium">From Date</Text>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              bg="white"
            />
          </Box>
          
          <Box minW="150px">
            <Text fontSize="sm" mb={1} color="gray.600" fontWeight="medium">To Date</Text>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              bg="white"
            />
          </Box>
        </Flex>

        {/* Available Tags */}
        {availableTags.length > 0 && (
          <Box mb={3}>
            <Text fontSize="sm" mb={2} color="gray.600" fontWeight="medium">Quick Tags</Text>
            <Wrap>
              {availableTags.slice(0, 10).map(tag => (
                <WrapItem key={tag}>
                  <Tag 
                    size="sm" 
                    variant={selectedTags.includes(tag) ? "solid" : "outline"}
                    colorScheme="blue"
                    cursor="pointer"
                    onClick={() => selectedTags.includes(tag) ? removeTag(tag) : addTag(tag)}
                  >
                    {tag}
                  </Tag>
                </WrapItem>
              ))}
            </Wrap>
          </Box>
        )}
      </Collapse>

      {/* Clear Filters */}
      {(search || category || fileType || selectedTags.length > 0 || dateFrom || dateTo) && (
        <Flex justify="flex-end">
          <Button size="sm" variant="ghost" onClick={clearAll}>
            Clear All Filters
          </Button>
        </Flex>
      )}
    </Box>
  );
}