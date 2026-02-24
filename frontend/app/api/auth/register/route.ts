import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import client from "@/lib/db";

export async function POST(req: NextRequest) {
    try {
        const { name, email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json(
                { error: "Email and password are required" },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: "Password must be at least 6 characters" },
                { status: 400 }
            );
        }

        const db = client.db();

        // Check if user already exists
        const existingUser = await db
            .collection("users")
            .findOne({ email: email.toLowerCase() });

        if (existingUser) {
            return NextResponse.json(
                { error: "An account with this email already exists" },
                { status: 409 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const result = await db.collection("users").insertOne({
            name: name || null,
            email: email.toLowerCase(),
            password: hashedPassword,
            image: null,
            emailVerified: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        return NextResponse.json(
            {
                success: true,
                user: {
                    id: result.insertedId.toString(),
                    name,
                    email: email.toLowerCase(),
                },
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Registration error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
