const EthBridge = require('../lib/EthBridge');
const testProverAddr = require("../misc/test.json").ProvethVerifier;
const abiJson = require("../misc/test_abi.json");
const rlp = require('rlp');
const { Proof, Header, Receipt } = require('eth-object');
const { BaseTrie } = require('merkle-patricia-tree');
const { toHex, toBuffer, encode } = require('eth-util-lite');
const Rpc  = require('isomorphic-rpc');
require("dotenv").config({path: './envs/eth.env'});
const { promisfy } = require('promisfy')
const Buffer = require('buffer').Buffer

const txHash = '0x245077bc61190fd7d33631e18186d39647dbd136e468004e5d4a2bd291d33b4d';

const eb = new EthBridge()
const web3 = eb.web3
const rpc = new Rpc(process.env.ETH_NODE_URL)

async function getReceiptsByTxHash(txns) {
    let promises = []
    for (let tx of txns) {
        promises.push( rpc.eth_getTransactionReceipt(tx) )
    }
    return Promise.all(promises)
}

async function makeReceiptTrie(txHash){
    let targetReceipt = await rpc.eth_getTransactionReceipt(txHash)

    let rpcBlock = await rpc.eth_getBlockByHash(targetReceipt.blockHash, false)

    let rpcReceipts = await getReceiptsByTxHash(rpcBlock.transactions)

    let trie = new BaseTrie();
    console.log("size", rpcReceipts.length)
    for (let receipt of rpcReceipts) {
        let key = encode(web3.utils.hexToNumber(receipt.transactionIndex))
        let val = Receipt.fromRpc(receipt).serialize()
        // console.log(key.toString('hex'))
        // console.log(val.toString('hex'))
        await trie.put(key, val)
    }
    console.log("exp root: ", rpcBlock.receiptsRoot)
    console.log("got root: ", web3.utils.bytesToHex(trie.root))

    // let targetKey = encode(web3.utils.hexToNumber(targetReceipt.transactionIndex))
    // let proof = await BaseTrie.createProof(trie, targetKey)

    return {
        root: web3.utils.bytesToHex(Header.fromRpc(rpcBlock).receiptRoot),
        proof: Proof.fromStack(stack),
        txIndex: targetReceipt.transactionIndex
    }
}

(async function() {

    try {
        // let resp = await eb.gp.receiptProof(txHash)
        // let root = web3.utils.bytesToHex(resp.header.receiptRoot)
        // let proof = encode(resp.receiptProof).toString('hex')
        // let key = resp.txIndex

        let resp = await eb.gp.receiptProof(txHash)
        let root = resp.header.receiptRoot
        let proof = encode(resp.receiptProof)
        let key = Buffer.from(web3.utils.hexToBytes(resp.txIndex))

        // console.log(root)
        // console.log(key)
        // console.log(proof)

        // let testProver = new eb.web3.eth.Contract(abiJson.abi, testProverAddr)
        // let response = await testProver.methods.MPTProof(root, key, proof).call({gasLimit: 4712388})

        // let resp = await eb.gp.receiptProof(txHash)
        //
        // let receiptHash = web3.utils.bytesToHex(resp.header.receiptRoot)
        //
        // let receiptRoot = web3.utils.bytesToHex(resp.header.receiptRoot)
        // let key = resp.txIndex
        // let receiptProof = web3.utils.bytesToHex(rlp.encode(resp.receiptProof))
        //
        let testProver = new eb.web3.eth.Contract(abiJson.abi, testProverAddr)

        let response = await testProver.methods.MPTProof(root, key, proof).call({gasLimit: 4712388})

        console.log(response)

    } catch (e) {
        console.log(e)
    }
} ()).catch( err => console.log ).finally(() => process.exit())
