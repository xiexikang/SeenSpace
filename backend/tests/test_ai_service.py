from app.schemas.ai import AnalysisRequestPayload
from app.services.ai_service import build_chat_messages, build_prompt, build_responses_input


def make_payload() -> AnalysisRequestPayload:
    return AnalysisRequestPayload.model_validate(
        {
            "scope": "canvas",
            "sourceNodeIds": ["image-1"],
            "nodes": [
                {
                    "id": "image-1",
                    "type": "image",
                    "title": "参考图",
                    "imageUrl": "data:image/png;base64,aW1hZ2U=",
                }
            ],
            "edges": [],
        }
    )


def test_prompt_does_not_duplicate_image_data() -> None:
    prompt = build_prompt(make_payload())

    assert "data:image" not in prompt
    assert "参考图" in prompt


def test_chat_messages_include_image_url_content() -> None:
    messages = build_chat_messages(make_payload())
    user_content = messages[1]["content"]

    assert any(item["type"] == "image_url" for item in user_content)
    assert user_content[-1]["image_url"]["url"].startswith("data:image/png;base64,")


def test_chat_messages_keep_plain_text_content_without_images() -> None:
    payload = make_payload()
    payload.nodes[0].imageUrl = None

    messages = build_chat_messages(payload)

    assert isinstance(messages[1]["content"], str)


def test_responses_input_includes_input_image_content() -> None:
    responses_input = build_responses_input(make_payload())
    user_content = responses_input[1]["content"]

    assert any(item["type"] == "input_image" for item in user_content)
    assert user_content[-1]["image_url"].startswith("data:image/png;base64,")
