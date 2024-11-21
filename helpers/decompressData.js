const zlib = require('zlib');

// Define the decompressData function
const decompressData = (compressedData) => {
    const compressedDataArray = Object.values(compressedData);
    const compressedBuffer = Buffer.from(compressedDataArray);


    return new Promise((resolve, reject) => {
        zlib.gunzip(compressedBuffer, (err, decompressedBuffer) => {
            if (err) {
                console.error('Error decompressing data:', err);
                reject(err); 
            } else {
                const decompressedString = decompressedBuffer.toString();
                console.log("Decompressed String:", decompressedString);

                try {
                    const jsonData = JSON.parse(decompressedString);
                    resolve(jsonData);
                } catch (parseError) {
                    console.error("Error parsing JSON:", parseError);
                    reject(parseError);
                }
            }
        });
    });
};

module.exports = decompressData;
