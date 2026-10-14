#!/usr/bin/env python3
"""批量自动抠图工具

把 assets/raw/ 里的原始球员照片处理成「背景透明、尺寸统一」的 PNG，输出到 assets/players/，
文件名与原图相同、扩展名改为 .png，网页里的球员卡片可以直接按文件名引用。

处理流程：
  1. 用 rembg 识别主体人物并去除背景
  2. 只保留面积最大的人物区域（面积超过最大区域 15% 的部分也保留），去掉残留的小色块
  3. 按人物轮廓裁掉多余的透明区域，四周留少量边距
  4. 等比缩放后，把人物底部居中放到统一大小的透明画布上

用法：
  npm run cutout                      （等同于 python tools/cutout.py）
  python tools/cutout.py --preview    处理完后生成 _preview.png 拼图检查效果
  python tools/cutout.py --help       查看全部参数
"""

import argparse
import os
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
支持的扩展名 = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
模型选项 = ["isnet-general-use", "birefnet-portrait", "u2net_human_seg"]
预览文件名 = "_preview.png"
保留面积比例 = 0.15  # 面积超过最大区域 15% 的连通区域也保留（防止手臂和身体被分开时被误删）


def 检查依赖():
    """导入第三方依赖；缺少时给出清晰的安装提示后退出。"""
    缺少 = []
    for 模块名, 包名 in [("numpy", "numpy"), ("PIL", "pillow"), ("scipy", "scipy"), ("rembg", "rembg[cpu]")]:
        try:
            __import__(模块名)
        except ImportError:
            缺少.append(包名)
    if 缺少:
        print("缺少依赖：" + "、".join(缺少))
        print("请先安装（建议在虚拟环境里）：")
        print("  python -m venv .venv && source .venv/bin/activate   # Windows：.venv\\Scripts\\activate")
        print("  pip install -r requirements.txt")
        sys.exit(1)


def 解析参数():
    p = argparse.ArgumentParser(description="批量自动抠图：把球员照片处理成背景透明、尺寸统一的 PNG")
    p.add_argument("--input", default=str(ROOT / "assets" / "raw"), help="原始照片目录（默认 assets/raw）")
    p.add_argument("--output", default=str(ROOT / "assets" / "players"), help="输出目录（默认 assets/players）")
    p.add_argument("--model", default="isnet-general-use", choices=模型选项,
                   help="抠图模型：isnet-general-use（默认，通用）、birefnet-portrait（人像更精细）、u2net_human_seg（最快）")
    p.add_argument("--width", type=int, default=800, help="统一画布宽度，默认 800")
    p.add_argument("--height", type=int, default=1000, help="统一画布高度，默认 1000")
    p.add_argument("--padding", type=int, default=8, help="人物四周保留的边距（像素，裁剪时的原图像素），默认 8")
    p.add_argument("--alpha-matting", action="store_true", help="开启边缘精修（头发细节更好，但更慢）")
    p.add_argument("--no-canvas", action="store_true", help="只裁剪到人物轮廓，不放到统一画布上")
    p.add_argument("--force", action="store_true", help="重新处理已存在的输出文件（默认跳过，方便增量添加新球员）")
    p.add_argument("--preview", action="store_true", help="额外生成 _preview.png：把所有结果排在棋盘格背景上，方便检查")
    参数 = p.parse_args()
    if 参数.width <= 0 or 参数.height <= 0 or 参数.padding < 0:
        p.error("--width、--height 必须大于 0，--padding 不能为负数")
    return 参数


def 读取为RGB(路径):
    """读取图片并统一转成 RGB（处理 CMYK、调色板、带透明通道、EXIF 旋转等情况）。"""
    from PIL import Image, ImageOps

    图 = Image.open(路径)
    图 = ImageOps.exif_transpose(图)  # 按拍摄方向摆正
    if 图.mode in ("RGBA", "LA") or (图.mode == "P" and "transparency" in 图.info):
        图 = 图.convert("RGBA")
        底 = Image.new("RGBA", 图.size, (255, 255, 255, 255))  # 透明部分垫白底再去背景
        图 = Image.alpha_composite(底, 图)
    return 图.convert("RGB")


def 去除背景(图, 会话, 边缘精修):
    """用 rembg 去背景，返回 RGBA 图。"""
    from rembg import remove

    参数 = {}
    if 边缘精修:
        参数 = dict(alpha_matting=True, alpha_matting_foreground_threshold=240,
                    alpha_matting_background_threshold=10, alpha_matting_erode_size=10)
    return remove(图, session=会话, **参数).convert("RGBA")


def 只保留主体(rgba):
    """连通区域分析：保留面积最大的区域，以及面积超过它 15% 的区域，其余视为背景残留并清除。"""
    import numpy as np
    from PIL import Image
    from scipy import ndimage

    数组 = np.array(rgba)
    透明度 = 数组[:, :, 3]
    前景 = 透明度 > 20
    标签, 数量 = ndimage.label(前景, structure=np.ones((3, 3)))  # 8 邻域
    if 数量 == 0:
        return rgba, 0
    面积 = ndimage.sum(前景, 标签, index=range(1, 数量 + 1))
    最大 = 面积.max()
    保留标签 = [i + 1 for i, a in enumerate(面积) if a >= 最大 * 保留面积比例]
    保留 = np.isin(标签, 保留标签)
    保留 = ndimage.binary_dilation(保留, iterations=3)  # 稍微外扩，保住边缘的半透明像素
    数组[:, :, 3] = np.where(保留, 透明度, 0)
    return Image.fromarray(数组, "RGBA"), 数量 - len(保留标签)


def 裁到人物(rgba, 边距):
    """裁掉多余的透明区域，四周留 边距 像素的透明边。"""
    from PIL import Image

    框 = rgba.getchannel("A").point(lambda v: 255 if v > 10 else 0).getbbox()
    if 框 is None:
        raise ValueError("没有识别到人物（抠图结果是空的）")
    裁剪 = rgba.crop(框)
    画 = Image.new("RGBA", (裁剪.width + 2 * 边距, 裁剪.height + 2 * 边距), (0, 0, 0, 0))
    画.paste(裁剪, (边距, 边距))
    return 画


def 放到统一画布(rgba, 宽, 高):
    """等比缩放到画布内，人物底部居中对齐，保证所有球员在卡片里大小、位置一致。"""
    from PIL import Image

    比例 = min(宽 / rgba.width, 高 / rgba.height)
    新宽, 新高 = max(1, round(rgba.width * 比例)), max(1, round(rgba.height * 比例))
    缩放 = rgba.resize((新宽, 新高), Image.LANCZOS)
    画布 = Image.new("RGBA", (宽, 高), (0, 0, 0, 0))
    画布.paste(缩放, ((宽 - 新宽) // 2, 高 - 新高), 缩放)
    return 画布


def 生成预览(输出目录, 宽, 高):
    """把输出目录里的所有 PNG 排成拼图，背景是棋盘格，方便一眼检查抠图质量。"""
    from PIL import Image, ImageDraw, ImageFont

    文件 = sorted(f for f in 输出目录.glob("*.png") if f.name != 预览文件名)
    if not 文件:
        return None
    格宽 = 240
    格高 = round(格宽 * 高 / 宽) if 宽 and 高 else 300
    格高 = max(200, min(格高, 360))
    标签高 = 26
    列数 = min(6, len(文件))
    行数 = (len(文件) + 列数 - 1) // 列数
    总宽, 总高 = 列数 * 格宽, 行数 * (格高 + 标签高)

    # 棋盘格背景
    底 = Image.new("RGB", (总宽, 总高), (255, 255, 255))
    笔 = ImageDraw.Draw(底)
    方块 = 16
    for y in range(0, 总高, 方块):
        for x in range(0, 总宽, 方块):
            if ((x // 方块) + (y // 方块)) % 2:
                笔.rectangle([x, y, x + 方块 - 1, y + 方块 - 1], fill=(205, 205, 205))
    字体 = ImageFont.load_default()
    for i, 路径 in enumerate(文件):
        图 = Image.open(路径).convert("RGBA")
        图.thumbnail((格宽 - 8, 格高 - 8), Image.LANCZOS)
        x0, y0 = (i % 列数) * 格宽, (i // 列数) * (格高 + 标签高)
        底.paste(图, (x0 + (格宽 - 图.width) // 2, y0 + 格高 - 图.height), 图)  # 底部对齐
        笔.rectangle([x0, y0 + 格高, x0 + 格宽, y0 + 格高 + 标签高], fill=(30, 30, 40))
        笔.text((x0 + 8, y0 + 格高 + 7), 路径.stem[:30], fill=(255, 255, 255), font=字体)
    目标 = 输出目录 / 预览文件名
    底.save(目标)
    return 目标


def 模型是否已下载(模型名):
    主目录 = Path(os.environ.get("U2NET_HOME", Path.home() / ".u2net"))
    return (主目录 / f"{模型名}.onnx").exists()


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(line_buffering=True)  # 进度及时显示，不被缓冲
    参数 = 解析参数()
    检查依赖()
    from rembg import new_session

    输入目录, 输出目录 = Path(参数.input), Path(参数.output)
    if not 输入目录.is_dir():
        输入目录.mkdir(parents=True, exist_ok=True)
        print(f"原始照片目录不存在，已为你创建：{输入目录}")
        print("请把球员照片（jpg / jpeg / png / webp / bmp）放进去，再重新运行。")
        return 0
    输出目录.mkdir(parents=True, exist_ok=True)

    图片 = sorted(f for f in 输入目录.iterdir() if f.is_file() and f.suffix.lower() in 支持的扩展名)
    if not 图片:
        print(f"{输入目录} 里没有找到图片（支持 jpg / jpeg / png / webp / bmp）。")
        return 0

    # 同名不同扩展名（如 a.jpg 和 a.png）会产生同一个输出文件，提前提醒
    重名 = {}
    for f in 图片:
        重名.setdefault(f.stem.lower(), []).append(f.name)
    for 名, 列表 in 重名.items():
        if len(列表) > 1:
            print(f"注意：{'、'.join(列表)} 输出文件名相同，后面的会覆盖前面的。")

    待处理 = [f for f in 图片 if 参数.force or not (输出目录 / (f.stem + ".png")).exists()]
    跳过 = len(图片) - len(待处理)

    成功, 失败 = 0, []
    if 待处理:
        if not 模型是否已下载(参数.model):
            print(f"首次使用模型 {参数.model}，rembg 会自动下载（约 100–200 MB，需要联网），请稍等……")
        print(f"使用模型：{参数.model}，共 {len(待处理)} 张待处理"
              + ("，已开启边缘精修（较慢）" if 参数.alpha_matting else ""))
        try:
            会话 = new_session(参数.model)
        except Exception as 错误:  # 下载失败、模型名无效等
            print(f"无法加载模型 {参数.model}：{错误}")
            print("请检查网络连接后重试；如果反复失败，可以换用 --model u2net_human_seg。")
            return 1

        for 序号, 文件 in enumerate(待处理, 1):
            开始 = time.time()
            try:
                图 = 读取为RGB(文件)
                结果 = 去除背景(图, 会话, 参数.alpha_matting)
                结果, 清除数 = 只保留主体(结果)
                结果 = 裁到人物(结果, 参数.padding)
                if not 参数.no_canvas:
                    结果 = 放到统一画布(结果, 参数.width, 参数.height)
                目标 = 输出目录 / (文件.stem + ".png")
                结果.save(目标, "PNG", optimize=True)
                成功 += 1
                备注 = f"，清除 {清除数} 块残留" if 清除数 else ""
                print(f"[{序号}/{len(待处理)}] {文件.name} -> {目标.name}  ({time.time() - 开始:.1f}s{备注})")
            except Exception as 错误:  # 单张失败不中断整个批处理
                失败.append(文件.name)
                print(f"[{序号}/{len(待处理)}] {文件.name} 处理失败：{错误}")
    else:
        print("没有需要处理的新照片（已处理过的会被跳过，加 --force 可重新处理）。")

    if 参数.preview:
        预览 = 生成预览(输出目录, 参数.width, 参数.height)
        if 预览:
            print(f"预览拼图已生成：{预览}")
        else:
            print("输出目录里还没有结果，未生成预览。")

    print(f"\n处理 {成功} 张、跳过 {跳过} 张、失败 {len(失败)} 张")
    if 失败:
        print("失败的文件：" + "、".join(失败))
        return 1
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n已中断。")
        sys.exit(130)
