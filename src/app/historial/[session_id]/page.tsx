import React from "react";
import SessionViewClient from "./SessionViewClient";

export default async function SessionViewPage(props: {
    params: Promise<{ session_id: string }>;
}) {
    const params = await props.params;
    return <SessionViewClient sessionId={params.session_id} />;
}
