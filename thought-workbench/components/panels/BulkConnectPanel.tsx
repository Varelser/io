import React from "react";
import { Button } from "../ui/Button";
import { Select } from "../ui/Select";

export type BulkConnectPanelProps = {
  bulkConnectMode: "chain" | "pairwise";
  onChangeBulkConnectMode: (value: "chain" | "pairwise") => void;
  onBulkConnect: () => void;
  lang?: "ja" | "en";
};

export function BulkConnectPanel({
  bulkConnectMode,
  onChangeBulkConnectMode,
  onBulkConnect,
  lang = "ja",
}: BulkConnectPanelProps) {
  const isJa = lang === "ja";
  return (
    <div className="grid grid-cols-[1fr_auto] gap-1.5">
      <Select
        value={bulkConnectMode}
        onChange={(e) => onChangeBulkConnectMode(e.target.value as "chain" | "pairwise")}
      >
        <option value="chain">{isJa ? "連鎖接続" : "chain connect"}</option>
        <option value="pairwise">{isJa ? "相互接続" : "pairwise connect"}</option>
      </Select>
      <Button onClick={onBulkConnect}>{isJa ? "接続" : "Connect"}</Button>
    </div>
  );
}
