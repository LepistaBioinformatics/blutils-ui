const path = require('path');
module.exports = {
    webpack: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
        },
        configure: (config) => {
            // flowbite-react ships source maps that point to its unpublished `src/`.
            config.ignoreWarnings = [
                ...(config.ignoreWarnings || []),
                /Failed to parse source map/,
            ];
            return config;
        },
    },
};
