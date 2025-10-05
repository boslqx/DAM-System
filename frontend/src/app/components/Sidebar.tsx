"use client";

import { Box, VStack, IconButton, Text, Tooltip } from "@chakra-ui/react";
import { FiHome, FiUpload, FiSettings } from "react-icons/fi";
import { motion } from "framer-motion";
import { useState } from "react";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      animate={{ width: isOpen ? 200 : 60 }}
      transition={{ duration: 0.25 }}
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        height: "100vh",
        backgroundColor: "#F7F5F2",
        boxShadow: "2px 0 5px rgba(0,0,0,0.1)",
        overflow: "hidden",
        zIndex: 1000,
      }}
    >
      <VStack spacing={6} mt={8}>
        <Tooltip label="Dashboard" placement="right">
          <IconButton aria-label="Home" icon={<FiHome />} variant="ghost" />
        </Tooltip>

        <Tooltip label="Upload" placement="right">
          <IconButton aria-label="Upload" icon={<FiUpload />} variant="ghost" />
        </Tooltip>

        <Tooltip label="Settings" placement="right">
          <IconButton aria-label="Settings" icon={<FiSettings />} variant="ghost" />
        </Tooltip>

        {isOpen && <Text fontWeight="bold">DAM System</Text>}
      </VStack>
    </motion.div>
  );
}
