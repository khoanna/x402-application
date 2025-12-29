import dotenv from "dotenv";

dotenv.config();

const SERVICE_BASE_URL = "http://localhost:4000";
const FACILITATOR_BASE_URL = "http://localhost:9000";

/**
 * Diagnostic tool to debug the x402 payment flow
 * Shows detailed information about requests, responses, and payment headers
 */

async function checkServiceHealth() {
  console.log("🏥 Checking service health...\n");
  
  try {
    const response = await fetch(`${SERVICE_BASE_URL}/city/list`);
    console.log(`✅ Service (port 4000): ${response.status} ${response.statusText}`);
    return true;
  } catch (error) {
    console.log("❌ Service (port 4000) is NOT running");
    return false;
  }
}

async function checkFacilitatorHealth() {
  try {
    const response = await fetch(`${FACILITATOR_BASE_URL}/supported`);
    console.log(`✅ Facilitator (port 9000): ${response.status} ${response.statusText}`);
    return true;
  } catch (error) {
    console.log("❌ Facilitator (port 9000) is NOT running");
    return false;
  }
}

async function testDirectServiceCall() {
  console.log("\n📡 Testing Direct Service Call (No Payment)\n");
  
  try {
    const response = await fetch(`${SERVICE_BASE_URL}/weather/current/us-nyc`);
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log("\n📋 Response Headers:");
    
    const headers: Record<string, string> = {};
    response.headers.forEach((value, name) => {
      headers[name] = value;
    });
    
    if (Object.keys(headers).length === 0) {
      console.log("  (No headers returned)");
    } else {
      Object.entries(headers).forEach(([name, value]) => {
        console.log(`  ${name}: ${value}`);
      });
    }
    
    // Look for x402 specific headers
    const x402Headers = Object.keys(headers).filter(h => h.toLowerCase().includes("x402") || h.toLowerCase().includes("payment"));
    console.log(`\n🔍 x402/Payment Headers Found: ${x402Headers.length}`);
    x402Headers.forEach(h => console.log(`  ✓ ${h}`));
    
    const data = await response.json();
    console.log("\n✅ Response Data:");
    console.log(JSON.stringify(data, null, 2));
    
    return { status: response.status, hasPaymentHeaders: x402Headers.length > 0 };
  } catch (error) {
    console.error("❌ Error:", error);
    return { status: 0, hasPaymentHeaders: false };
  }
}

async function testPaymentFlow() {
  console.log("\n💳 Testing Payment Flow (With x402 Client)\n");
  
  try {
    const { wrapFetchWithPayment } = await import("@x402/fetch");
    const { x402Client } = await import("@x402/core/client");
    const { registerExactEvmScheme } = await import("@x402/evm/exact/client");
    const { privateKeyToAccount } = await import("viem/accounts");
    
    const signer = privateKeyToAccount(process.env.BUYER_PRIVATE_KEY as `0x${string}`);
    const client = new x402Client();
    registerExactEvmScheme(client, { signer });
    const fetchWithPayment = wrapFetchWithPayment(fetch, client);
    
    console.log("✅ Payment client initialized");
    console.log(`   Signer Address: ${signer.address}`);
    
    const response = await fetchWithPayment(`${SERVICE_BASE_URL}/weather/current/gb-ldn`, {
      method: "GET",
    });
    
    console.log(`\nStatus: ${response.status} ${response.statusText}`);
    console.log("\n📋 Response Headers:");
    
    const headers: Record<string, string> = {};
    response.headers.forEach((value, name) => {
      headers[name] = value;
    });
    
    if (Object.keys(headers).length === 0) {
      console.log("  (No headers returned)");
    } else {
      Object.entries(headers).forEach(([name, value]) => {
        console.log(`  ${name}: ${value}`);
      });
    }
    
    // Look for x402 specific headers
    const x402Headers = Object.keys(headers).filter(h => 
      h.toLowerCase().includes("x402") || 
      h.toLowerCase().includes("payment") ||
      h.toLowerCase().includes("authorization") ||
      h.toLowerCase().includes("content-type") // Important for payment responses
    );
    
    console.log(`\n🔍 Important Headers Found: ${x402Headers.length}`);
    x402Headers.forEach(h => console.log(`  ✓ ${h}: ${headers[h]}`));
    
    const data = await response.json();
    console.log("\n✅ Response Data:");
    console.log(JSON.stringify(data, null, 2));
    
    return { status: response.status, hasPaymentHeaders: x402Headers.length > 0 };
  } catch (error) {
    console.error("❌ Error:", error);
    return { status: 0, hasPaymentHeaders: false };
  }
}

async function checkEnvironment() {
  console.log("\n⚙️  Environment Configuration\n");
  
  console.log("Server:");
  console.log(`  BUYER_PRIVATE_KEY: ${process.env.BUYER_PRIVATE_KEY ? "✓ Set" : "✗ Missing"}`);
  
  console.log("\nService (should be set in service/.env):");
  console.log("  FACILITATOR_PRIVATE_KEY: (check in service/.env)");
  console.log("  INFURA_RPC_URL: (check in service/.env)");
}

async function runDiagnostics() {
  console.log("🔧 x402 Payment Flow Diagnostics");
  console.log("===================================\n");
  
  checkEnvironment();
  
  const serviceHealthy = await checkServiceHealth();
  const facilitatorHealthy = await checkFacilitatorHealth();
  
  if (!serviceHealthy || !facilitatorHealthy) {
    console.log("\n❌ Required services not running. Cannot continue.");
    process.exit(1);
  }
  
  const directResult = await testDirectServiceCall();
  const paymentResult = await testPaymentFlow();
  
  console.log("\n📊 Summary\n");
  console.log("Direct Service Call (No Payment):");
  console.log(`  Status: ${directResult.status}`);
  console.log(`  Payment Headers: ${directResult.hasPaymentHeaders ? "✓ Found" : "✗ Not Found"}`);
  
  console.log("\nWith x402 Payment Client:");
  console.log(`  Status: ${paymentResult.status}`);
  console.log(`  Payment Headers: ${paymentResult.hasPaymentHeaders ? "✓ Found" : "✗ Not Found"}`);
  
  console.log("\n" + "=".repeat(50));
  if (!paymentResult.hasPaymentHeaders) {
    console.log("⚠️  Payment headers not found in service responses");
    console.log("\nPossible causes:");
    console.log("1. Payment middleware not properly configured in service/src/server.ts");
    console.log("2. Facilitator not properly handling payment settlement");
    console.log("3. Missing environment variables on service");
    console.log("4. Route patterns don't match actual request paths");
    console.log("\nSee PAYMENT_HEADER_WARNING.md for detailed investigation steps.");
  } else {
    console.log("✅ Payment flow appears to be working correctly!");
  }
}

runDiagnostics()
  .then(() => {
    console.log("\nDiagnostics complete.\n");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Diagnostics failed:", error);
    process.exit(1);
  });
