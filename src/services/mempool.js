const mempoolJS = require('@mempool/mempool.js');

async function getLastBlockAndHash() {
    try {
        const { bitcoin } = mempoolJS();
        const latestBlocks = await bitcoin.blocks.getBlocks({
            start_height: undefined,
            end_height: undefined
        });

        const latestBlock = latestBlocks[0];
        const blockHeight = latestBlock.height;
        const blockHash = latestBlock.id;

        return { height: blockHeight, hash: blockHash };
    } catch (error) {
        console.error('Error fetching latest block:', error);
        return null;
    }
}

module.exports = { getLastBlockAndHash };
