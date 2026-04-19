require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const Content = require("./models/Content");
const ReviewAction = require("./models/ReviewAction");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/content-review";

const users = [
  {
    name: "Alice Chen",
    email: "alice@example.com",
    role: "creator",
    avatar: "AC",
  },
  {
    name: "Bob Smith",
    email: "bob@example.com",
    role: "editor",
    avatar: "BS",
  },
  {
    name: "Carol Davis",
    email: "carol@example.com",
    role: "approver",
    avatar: "CD",
  },
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    // Clear existing data
    await User.deleteMany({});
    await Content.deleteMany({});
    await ReviewAction.deleteMany({});
    console.log("Cleared existing data");

    // Insert users
    const createdUsers = await User.insertMany(users);
    console.log(`Created ${createdUsers.length} users:`);
    createdUsers.forEach((u) => console.log(`  → ${u.name} (${u.role}) — ID: ${u._id}`));

    // Create a sample draft content for Alice
    const alice = createdUsers.find((u) => u.role === "creator");
    await Content.create({
      title: "Getting Started with Our Product",
      body: "This is a sample piece of content created to demonstrate the approval workflow. It covers the basics of how to use the platform effectively.\n\nKey points:\n- Easy to use interface\n- Powerful features\n- Great support",
      tags: ["onboarding", "guide"],
      createdBy: alice._id,
      status: "draft",
    });
    console.log("\nCreated 1 sample draft content for Alice");

    console.log("\n✓ Seed complete!");
    console.log("\nUser IDs (copy these to test the API):");
    createdUsers.forEach((u) => console.log(`  ${u.role.toUpperCase()}: ${u._id}`));
  } catch (err) {
    console.error("Seed error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
