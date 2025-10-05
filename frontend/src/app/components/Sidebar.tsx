"use client";

import { Box, VStack, IconButton, Tooltip } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { Home, Upload, Settings } from "lucide-react";
import { useState } from "react";

const MotionBox = motion(Box);

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <MotionBox
      position="fixed"
      top="0"
      left="0"
      h="100vh"
      bg="linear-gradient(135deg, #f5f3ef, #d8e6f3)" // beige-blue gradient
      boxShadow="md"
      zIndex="1000"
      borderRight="1px solid #e0e0e0"
      initial={{ width: "60px" }}
      animate={{ width: isOpen ? "220px" : "60px" }}
      transition={{ duration: 0.3 }}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="space-between"
      overflow="hidden"
      p={2}
    >
      <VStack spacing={4} mt={6}>
        <Tooltip label="Dashboard" placement="right">
          <IconButton aria-label="Dashboard" icon={<Home />} variant="ghost" />
        </Tooltip>
        <Tooltip label="Upload" placement="right">
          <IconButton aria-label="Upload" icon={<Upload />} variant="ghost" />
        </Tooltip>
        <Tooltip label="Settings" placement="right">
          <IconButton aria-label="Settings" icon={<Settings />} variant="ghost" />
        </Tooltip>
      </VStack>
    </MotionBox>
  );
}

