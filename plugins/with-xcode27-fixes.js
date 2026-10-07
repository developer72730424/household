// Podfile の post_install に、Xcode 27 でビルドを通すための設定を追加する Expo config plugin。
// - 全 Pod の最低 iOS バージョンを揃える（iOS 15.0 未満を指定した SDWebImage, RNSVG, AsyncStorage などがエラーになるため）
// - fmt を C++17 でビルドする（下記コメント参照）
// ios/ は prebuild のたびに作り直されるので、Podfile を直接編集せずこのプラグインで差し込む。
const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

const MARKER = '# [with-xcode27-fixes]';

module.exports = function withXcode27Fixes(config, { minimum = '15.1' } = {}) {
    return withDangerousMod(config, [
        'ios',
        (cfg) => {
            const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
            let podfile = fs.readFileSync(podfilePath, 'utf8');
            if (!podfile.includes(MARKER)) {
                const snippet = [
                    `    ${MARKER}`,
                    '    installer.pods_project.targets.each do |target|',
                    '      target.build_configurations.each do |build_config|',
                    `        if build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f < ${minimum}`,
                    `          build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${minimum}'`,
                    '        end',
                    // fmt 11.0 の consteval が Xcode 27 の clang でコンパイルエラーになるため、
                    // fmt だけ C++17 でビルドして consteval を無効化する（fmt 側の自動判定に任せる）
                    "        if target.name == 'fmt'",
                    "          build_config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'",
                    '        end',
                    '      end',
                    '    end',
                ].join('\n');
                // react_native_post_install が全 Pod を C++20 に上書きするので、その呼び出しの後ろに差し込む
                const afterRnPostInstall = /(react_native_post_install\([\s\S]*?\n\s*\)\n)/;
                if (!afterRnPostInstall.test(podfile)) {
                    throw new Error('[with-xcode27-fixes] Podfile に react_native_post_install が見つかりません');
                }
                podfile = podfile.replace(afterRnPostInstall, `$1${snippet}\n`);
                fs.writeFileSync(podfilePath, podfile);
            }
            return cfg;
        },
    ]);
};
