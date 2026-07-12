import { Client } from "pg";

async function main() {
  const passwords = [
    "root",
    "1234",
    "123456",
    "password",
    "Aryan@123",
    "Ansh@123",
    "admin123",
    "postgres123",
    "admin",
  ];

  for (const pw of passwords) {
    const conn = `postgresql://postgres:${pw}@localhost:5432/postgres`;
    const client = new Client({ connectionString: conn });
    try {
      await client.connect();
      console.log(`FOUND WORKING PASSWORD: ${pw}`);
      await client.end();
      return;
    } catch (err: any) {
      // Continue
    }
  }
  console.log("None of the common passwords worked.");
}

main().catch(console.error);
