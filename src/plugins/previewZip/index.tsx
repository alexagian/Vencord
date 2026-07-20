/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { Devs } from "@utils/constants";
import definePlugin, { PluginNative } from "@utils/types";
import { React } from "@webpack/common";
import { unzip } from "fflate";

const Native = VencordNative.pluginHelpers.PreviewZip as PluginNative<typeof import("./native")>;

interface TreeNode {
    name: string;
    isDir: boolean;
    size: number;
    children: Map<string, TreeNode>;
}

// keeps already loaded the ZIP files so we don't read the same file twice. :p
const cache = new Map<string, TreeNode | string>();

function formatSize(bytes: number) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1024 / 1024).toFixed(1) + " MB";
}

function buildTree(files: { name: string, size: number; }[]) {
    const root: TreeNode = { name: "", isDir: true, size: 0, children: new Map() };

    for (const file of files) {
        const parts = file.name.split("/").filter(Boolean);
        let node = root;

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const last = i === parts.length - 1;

            if (!node.children.has(part)) {
                node.children.set(part, {
                    name: part,
                    isDir: !last || file.name.endsWith("/"),
                    size: 0,
                    children: new Map()
                });
            }

            node = node.children.get(part)!;
            if (last) node.size = file.size;
        }
    }

    return root;
}

function Tree({ node, depth = 0 }: { node: TreeNode, depth?: number; }) {
    const entries = [...node.children.values()].sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
        return a.name.localeCompare(b.name);
    });

    return (
        <>
            {entries.map(entry => (
                <React.Fragment key={entry.name}>
                    <div className="previewzip-row" style={{ paddingLeft: depth * 14 }}>
                        <span className="previewzip-name">{entry.name}{entry.isDir ? "/" : ""}</span>
                        {!entry.isDir && <span className="previewzip-size"> ({formatSize(entry.size)})</span>}
                    </div>
                    {entry.isDir && <Tree node={entry} depth={depth + 1} />}
                </React.Fragment>
            ))}
        </>
    );
}

function ZipCard({ filename, url, size }: { filename: string, url: string, size: number; }) {
    const [tree, setTree] = React.useState<TreeNode | string | null>(cache.get(url) ?? null);

    React.useEffect(() => {
        if (cache.has(url)) return;

        Native.fetchZip(url).then(bytes => {
            const files: { name: string, size: number; }[] = [];

            unzip(bytes, {
                filter(f) {
                    files.push({ name: f.name, size: f.originalSize ?? 0 });
                    return false;
                }
            }, err => {
                if (!err) {
                    const result = buildTree(files);
                    cache.set(url, result);
                    setTree(result);
                }
            });
        }).catch(() => {
        });
    }, [url]);

    return (
        <div className="previewzip-card">
            <div className="previewzip-header">
                <span className="previewzip-icon">💕</span>
                <div className="previewzip-header-text">
                    <a href={url} target="_blank" rel="noreferrer" className="previewzip-filename">{filename}</a>
                    <span className="previewzip-header-size">{formatSize(size)}</span>
                </div>
            </div>
            <div className="previewzip-body">
                {tree && typeof tree !== "string" && <Tree node={tree} />}
            </div>
        </div>
    );
}

export default definePlugin({
    name: "PreviewZip",
    description: "Shows what is inside the .zip folder without having to download them",
    authors: [Devs.alexagian],

    renderMessageAccessory(props) {
        const zips = props.message.attachments?.filter(a => a.filename.toLowerCase().endsWith(".zip"));
        if (!zips?.length) return null;

        return <>{zips.map(a => <ZipCard key={a.id} filename={a.filename} url={a.url} size={a.size} />)}</>;
    }
});
