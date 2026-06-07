"use server";

import prisma from "@/lib/prisma";

export async function testDatabaseConnection() {
  try {
    // Jalankan query SQL mentah untuk tes koneksi database
    const result = (await prisma.$queryRaw`SELECT NOW()`) as Array<{
      now: Date;
    }>;

    return {
      status: "success",
      message:
        "Database connection established successfully via Server Action!",
      data: result,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Database Connection Error (Server Action):", error);
    return {
      status: "error",
      message: "Failed to connect to the database via Server Action.",
      error: errorMessage,
      timestamp: new Date().toISOString(),
    };
  }
}
