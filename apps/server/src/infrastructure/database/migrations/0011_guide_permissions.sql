-- A leitura de um guia passa a aceitar várias permissões: o campo permission vira a lista permissions.
UPDATE "guides"
SET
	"draft" = ("draft" - 'permission') || jsonb_build_object(
		'permissions',
		CASE
			WHEN "draft" ->> 'permission' IS NULL THEN '[]'::jsonb
			ELSE jsonb_build_array("draft" ->> 'permission')
		END
	),
	"published" = CASE
		WHEN "published" IS NULL THEN NULL
		ELSE ("published" - 'permission') || jsonb_build_object(
			'permissions',
			CASE
				WHEN "published" ->> 'permission' IS NULL THEN '[]'::jsonb
				ELSE jsonb_build_array("published" ->> 'permission')
			END
		)
	END
WHERE
	"draft" ? 'permission' OR "published" ? 'permission';
