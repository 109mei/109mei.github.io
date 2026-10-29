# 握力灯台 LIGHTHOLD（灯台守）

握る強さで灯台の灯をともし、夜の海の岩を照らして、船を港へ導くゲームです。パソコンのブラウザ（Chrome・Edge）で遊びます。

- 公開中のページ：**https://109mei.github.io/lighthold/**
- 握り具がなくても遊べます：**Space キーを押しているあいだ灯がともり、マウスで灯の向きを変えます**
- 握り具（USB）は、題名の画面の「道具をつなぐ」からつなぎます（Chrome・Edge の Web Serial）
- 遊んだ記録はブラウザの中にだけ残ります（外へは送りません）
- 治療や機能回復の効果を確かめたものではありません

企画・制作：IDERIA（永野斗遠）。ソースコードは制作用のフォルダ（medgame/code/games/tomori）にあり、ここに置いているのはビルドした遊ぶための版です。

## 3D モデル

3D モデルは、ゲームに組み込んだ 1 つのまとめファイル（`models/world.pack`）に入っています。**このゲームの外で使うために取り出したり、配ったりしないでください。**

### CC BY 4.0（Scenario 3D Collection）

- Lantern Rock lighthouse island by Scenario（Scenario 3D Collection, CC BY 4.0） — https://huggingface.co/datasets/scenario-labs/3d-collection/resolve/main/assets/scenario_asset_JhRNbnnQugjaBnqe2Ng4Ym43/output.glb
- Tugboat by Scenario（Scenario 3D Collection, CC BY 4.0） — https://huggingface.co/datasets/scenario-labs/3d-collection/resolve/main/assets/db0658339e7adc81/35bb5cce7d6c25cc.glb
- Steampunk steamboat by Scenario（Scenario 3D Collection, CC BY 4.0） — https://huggingface.co/datasets/scenario-labs/3d-collection/resolve/main/assets/5463ca0c95d472a2/8f791771b64ce81e.glb
- Pirate ship by Scenario（Scenario 3D Collection, CC BY 4.0） — https://huggingface.co/datasets/scenario-labs/3d-collection/resolve/main/assets/scenario_asset_GZMGsnVMMneNe3HdyDrvZBKg/output.glb

ライセンス：https://creativecommons.org/licenses/by/4.0/ 。大きさと向きをそろえ、圧縮して使っています。

### threejsassets.com の無料素材（Free Commercial License）

- Faering Rowboat（threejsassets.com、無料素材） — https://threejsassets.com/assets/faering-rowboat
- Jon Boat（threejsassets.com、無料素材） — https://threejsassets.com/assets/jon-boat
- Longship Drakkar（threejsassets.com、無料素材） — https://threejsassets.com/assets/longship-drakkar
- Rock Cluster（threejsassets.com、無料素材） — https://threejsassets.com/assets/rock-cluster
- Fjord Cliff Rock（threejsassets.com、無料素材） — https://threejsassets.com/assets/fjord-cliff-rock
- Jetty Pier（threejsassets.com、無料素材） — https://threejsassets.com/assets/jetty-pier
- Marina Dock Module（threejsassets.com、無料素材） — https://threejsassets.com/assets/marina-dock-module
- Mooring Piling Cluster（threejsassets.com、無料素材） — https://threejsassets.com/assets/mooring-piling-cluster
- Harbor Marker Post（threejsassets.com、無料素材） — https://threejsassets.com/assets/harbor-marker-post
- Arctic Storm Lantern（threejsassets.com、無料素材） — https://threejsassets.com/assets/arctic-storm-lantern
- Cloud Thunderhead（threejsassets.com、無料素材） — https://threejsassets.com/assets/cloud-thunderhead
- Bait Shack（threejsassets.com、無料素材） — https://threejsassets.com/assets/bait-shack
- Stilt Shack（threejsassets.com、無料素材） — https://threejsassets.com/assets/stilt-shack
- Boat House（threejsassets.com、無料素材） — https://threejsassets.com/assets/boat-house
- General Store（threejsassets.com、無料素材） — https://threejsassets.com/assets/general-store
- Home Cottage 01（threejsassets.com、無料素材） — https://threejsassets.com/assets/home-cottage-01
- Home Thatched House 01（threejsassets.com、無料素材） — https://threejsassets.com/assets/home-thatched-house-01
- Tree Oak 01（threejsassets.com、無料素材） — https://threejsassets.com/assets/tree-oak-01
- Bush Round 01（threejsassets.com、無料素材） — https://threejsassets.com/assets/bush-round-01
- Streetlamp 01（threejsassets.com、無料素材） — https://threejsassets.com/assets/streetlamp-01
- Barrel 01（threejsassets.com、無料素材） — https://threejsassets.com/assets/barrel-01
- Crate 01（threejsassets.com、無料素材） — https://threejsassets.com/assets/crate-01

ライセンス：https://docs.threejsassets.com/licensing/license-terms 。ゲームに組み込んで使っています（素材だけを配ることは禁止されています）。

## 書体

- Noto Sans JP・Shippori Mincho・Klee One（いずれも SIL Open Font License 1.1）。ゲームで使う文字だけに絞った版を入れています。

## ライブラリ

three.js・React・Zustand・Zod（いずれも MIT）。ライセンスの全文は `THIRD_PARTY_NOTICES.md` にあります。
