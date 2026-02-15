const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

module.exports = function withManifestMessagingFix(config) {
    return withAndroidManifest(config, async (config) => {
        const androidManifest = config.modResults;
        const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(androidManifest);

        // Ensure 'tools' namespace is available for 'tools:replace'
        if (!androidManifest.manifest.$['xmlns:tools']) {
            androidManifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
        }

        const metaDataList = mainApplication['meta-data'] || [];

        // Keys that are conflicting
        const conflictingKeys = [
            'com.google.firebase.messaging.default_notification_channel_id',
            'com.google.firebase.messaging.default_notification_icon',
            'com.google.firebase.messaging.default_notification_color'
        ];

        console.log('[ManifestFix] Scanning meta-data for conflicts...');

        metaDataList.forEach((metaData) => {
            const name = metaData.$['android:name'];
            if (conflictingKeys.includes(name)) {
                console.log(`[ManifestFix] Found conflicting key: ${name}`);

                // Add tools:replace
                // We need to be careful with existing tools:replace
                let toolsReplace = metaData.$['tools:replace'] || '';
                let newReplace = '';

                if (metaData.$['android:value']) {
                    newReplace = 'android:value';
                } else if (metaData.$['android:resource']) {
                    newReplace = 'android:resource';
                }

                if (newReplace) {
                    if (toolsReplace) {
                        if (!toolsReplace.includes(newReplace)) {
                            toolsReplace += `,${newReplace}`;
                        }
                    } else {
                        toolsReplace = newReplace;
                    }
                    metaData.$['tools:replace'] = toolsReplace;
                    console.log(`[ManifestFix] Added tools:replace="${toolsReplace}" to ${name}`);
                }
            }
        });

        return config;
    });
};
