#!/bin/sh
# すべての自動テストを順に実行する（先に node build.js）
cd "$(dirname "$0")/.." || exit 1
node build.js
for t in test_physics test_rules test_stage test_input test_sound test_cpu test_resize test_online test_online3; do
  echo "=== $t ==="
  node tools/$t.js 2>&1 | grep -E "^(×|失敗|すべて合格|ページのエラー:)|Error"
done
echo "=== test_online2（通信の遅れ60ms・1割落ち） ==="
node tools/test_online2.js 60 0.1 2>&1 | grep -E "^(〇|×)"
