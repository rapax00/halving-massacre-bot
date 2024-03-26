const mempoolJS = require('@mempool/mempool.js');

async function getLastBlock() {
    try {
        const { bitcoin } = mempoolJS();
        const latestBlocks = await bitcoin.blocks.getBlocks({
            start_height: undefined,
            end_height: undefined
        });
        return Number(latestBlocks[0].height);
    } catch (error) {
        console.error('Error fetching latest block:', error);
        return null;
    }
}

async function getLastBlockHash() {
    try {
        const { bitcoin } = mempoolJS();
        const latestBlocks = await bitcoin.blocks.getBlocks({
            start_height: undefined,
            end_height: undefined
        });
        return latestBlocks[0].hash.toString();
    } catch (error) {
        console.error('Error fetching latest block:', error);
        return null;
    }
}

module.exports = { getLastBlock, getLastBlockHash };
