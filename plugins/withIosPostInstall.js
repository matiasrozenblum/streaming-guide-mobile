const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withIosPostInstall = (config) => {
    return withDangerousMod(config, [
        'ios',
        async (config) => {
            const file = path.join(config.modRequest.platformProjectRoot, 'Podfile');

            // Check if file exists (it might not if we destroyed 'ios' folder and prebuild hasn't run yet)
            // But 'run:ios' runs prebuild. However, withDangerousMod runs AFTER the base prebuild/generation?
            // Actually, 'ios' modifier runs when the 'ios' folder is being generated/updated.
            // If the file doesn't exist, we can't patch it.
            // But typically Expo Generates the Podfile before running dangerous mods?
            // Correct. However, if we deleted 'ios' folder, we rely on 'npx expo run:ios' to regenerate it.
            // The mod should run after generation.

            if (!fs.existsSync(file)) {
                // If Podfile doesn't exist, we can't patch it. 
                // This might happen if this plugin runs before the Podfile is created.
                // But usually dangerous mods run last.
                return config;
            }

            const contents = await fs.promises.readFile(file, 'utf8');

            let newContents = contents;

            // 1. Add $RNFirebaseAsStaticFramework = true at the top if not present
            if (!newContents.includes('$RNFirebaseAsStaticFramework = true')) {
                newContents = `$RNFirebaseAsStaticFramework = true\n` + newContents;
            }

            // 2. Inject CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES
            // The Podfile uses `post_install do |installer|` followed by `react_native_post_install`.
            // We want to insert our loop right after `react_native_post_install(...) \n  end` or inside the block.
            // Let's replace the end of the block.

            if (!newContents.includes('CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES')) {
                // Look for the last 'end' of the post_install block?
                // Or just append inside the block.
                // A safer way is to replace `post_install do |installer|` and add our code at the START of the block.
                newContents = newContents.replace(
                    /post_install do \|installer\|/,
                    `post_install do |installer|
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end
    end`
                );
            }

            await fs.promises.writeFile(file, newContents, 'utf8');
            return config;
        },
    ]);
};

module.exports = withIosPostInstall;
