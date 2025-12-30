import { verifyTypedData, recoverTypedDataAddress } from 'viem';
import { baseSepolia } from 'viem/chains';

// Data from the log
const from = '0x88c45377C7653a3B5e42685cB74835f669D9A546';
const to = '0x220046E3d6561330D4D8F31b18C35EFEfD93eDd2';
const value = 1000n;
const validAfter = 1767081774n;
const validBefore = 1767082674n;
const nonce = '0x7d712b71ba365e1c7d2c56623f375cc3da1ad39374e4476917b4c6c66000383e';

// Signature components
const v = 27n;
const r = '0x914b420dd8a68397dcd76e9f1c6f6028b57ca1ea626387778db7d2b5ecb4e557';
const s = '0x30243dcaef80d550c85d7015ff3896355baf5272aba881322ffd3f6a52855e0a';

// Reconstruct the full signature
const signature = r + s.slice(2) + (v === 27n ? '1b' : '1c');

// EIP-712 domain and message for USDC transferWithAuthorization
const usdcAddress = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

const domain = {
  name: 'USDC',
  version: '2',
  chainId: baseSepolia.id, // 84532
  verifyingContract: usdcAddress,
};

const types = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
  ],
};

const message = {
  from,
  to,
  value,
  validAfter,
  validBefore,
  nonce,
};

async function main() {
  console.log('🔍 Analyzing USDC transferWithAuthorization signature...\n');
  
  console.log('Parameters:');
  console.log('  from:', from);
  console.log('  to:', to);
  console.log('  value:', value.toString());
  console.log('  validAfter:', validAfter.toString());
  console.log('  validBefore:', validBefore.toString());
  console.log('  nonce:', nonce);
  console.log('  signature:', signature);
  console.log();
  
  try {
    // Recover the address that actually signed this message
    const recoveredAddress = await recoverTypedDataAddress({
      domain,
      types,
      primaryType: 'TransferWithAuthorization',
      message,
      signature: `0x${signature}`,
    });
    
    console.log('✅ Signature Analysis:');
    console.log('  Expected signer (from):', from);
    console.log('  Actual signer (recovered):', recoveredAddress);
    console.log();
    
    if (recoveredAddress.toLowerCase() === from.toLowerCase()) {
      console.log('✅ SIGNATURE IS VALID - Signer matches "from" address');
    } else {
      console.log('❌ SIGNATURE IS INVALID - Signer does NOT match "from" address');
      console.log('\n🔍 This is why transferWithAuthorization is reverting!');
      console.log('   The signature was created by:', recoveredAddress);
      console.log('   But the transfer is from:', from);
      console.log('\n💡 Possible causes:');
      console.log('   1. Wrong private key used to sign');
      console.log('   2. Wrong EIP-712 domain/types used');
      console.log('   3. "from" should be the EOA that signed, not a smart account');
    }
  } catch (error) {
    console.error('❌ Error recovering address:', error.message);
  }
}

main();

