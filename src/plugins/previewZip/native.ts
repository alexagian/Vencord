/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { IpcMainInvokeEvent } from "electron";

export async function fetchZip(_event: IpcMainInvokeEvent, url: string) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`failed ${res.status}`);

    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
}