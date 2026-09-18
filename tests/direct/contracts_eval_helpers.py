"""Decision-field helpers mirrored from contracts/agent_proof.py for consensus unit tests."""

import json


def parse_criteria(raw: str) -> list:
    data = json.loads(str(raw or "").strip())
    if not isinstance(data, list):
        raise ValueError("criteria_json must be a JSON array")
    return [str(item).strip() for item in data if str(item or "").strip()]


def validate_eval_shape(verdict: dict, expected_ids: list) -> bool:
    status = str(verdict.get("status") or "").strip().upper()
    if status not in ("PASS", "FAIL", "INCONCLUSIVE"):
        return False
    criteria = verdict.get("criteria")
    if not isinstance(criteria, list) or len(criteria) != len(expected_ids):
        return False
    seen = []
    met_map = {}
    for row in criteria:
        if not isinstance(row, dict):
            return False
        try:
            cid = int(row.get("id"))
        except (TypeError, ValueError):
            return False
        if cid not in expected_ids or cid in seen:
            return False
        if row.get("met") is not True and row.get("met") is not False:
            return False
        seen.append(cid)
        met_map[cid] = bool(row.get("met"))
    if sorted(seen) != sorted(expected_ids):
        return False
    failed = verdict.get("failed_criteria")
    if not isinstance(failed, list):
        return False
    try:
        normalized_failed = [int(item) for item in failed]
    except (TypeError, ValueError):
        return False
    expected_failed = [cid for cid in expected_ids if not met_map[cid]]
    if sorted(normalized_failed) != sorted(expected_failed):
        return False
    if status == "PASS" and expected_failed:
        return False
    if status == "FAIL" and not expected_failed:
        return False
    return True


def eval_decision_agrees(leader_d: dict, validator_d: dict, expected_ids: list) -> bool:
    if str(leader_d.get("status") or "").upper() != str(validator_d.get("status") or "").upper():
        return False

    def met_map(data):
        out = {}
        for row in data.get("criteria") or []:
            if isinstance(row, dict):
                out[int(row.get("id"))] = row.get("met") is True
        return out

    lcrit, vcrit = met_map(leader_d), met_map(validator_d)
    for cid in expected_ids:
        if lcrit.get(cid) != vcrit.get(cid):
            return False
    try:
        lf = sorted(int(x) for x in (leader_d.get("failed_criteria") or []))
        vf = sorted(int(x) for x in (validator_d.get("failed_criteria") or []))
    except (TypeError, ValueError):
        return False
    return lf == vf
