const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withModularHeaders = (config) => {
    return withDangerousMod(config, [
        'ios',
        async (config) => {
            const file = path.join(config.modRequest.platformProjectRoot, 'Podfile');
            const contents = await fs.promises.readFile(file, 'utf8');
            if (!contents.includes('use_modular_headers!')) {
                await fs.promises.writeFile(
                    file,
                    `use_modular_headers!\n${contents}`
                );
            }
            return config;
        },
    ]);
};

module.exports = withModularHeaders;
