import { DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "../core/s3_client.js";

export async function uploadFile(
    key: string,
    body: Buffer,
    contentType: string,
) {
    await s3.send(
        new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME!,
            Key: key,
            Body: body,
            ContentType: contentType,
        }),
    );
}

export async function createUploadUrl(
    key: string,
    contentType: string,
) {
    const expireDuration = 60 * 5

    const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
        ContentType: contentType,
    });

    return getSignedUrl(s3, command, {
        expiresIn: expireDuration,
    });
}

export const createDownloadUrl = async (
    key: string
): Promise<string> => {
    const expireDuration = 60 * 5

    const command = new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key
    })

    return getSignedUrl(
        s3,
        command, {
        expiresIn: expireDuration
    }
    )
}

export const deleteStorageItem = async (
    key: string
) => {
    const command = new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key
    })

    await s3.send(command)
}

export const getStorageList = async () => {
    const expireDuration = 60 * 5

    const keysRetrivalCommand = new ListObjectsV2Command({
        Bucket: process.env.R2_BUCKET_NAME,
    })

    const objects = (await s3.send(keysRetrivalCommand)).Contents

    if (!objects) {
        return null
    }

    return Promise.all([
        objects
            .filter(obj => obj.Key)
            .map(async (object) => {
                const key = object.Key!;

                const preSignedCommand = new GetObjectCommand({
                    Bucket: process.env.R2_BUCKET_NAME,
                    Key: key
                })

                const url = await getSignedUrl(
                    s3,
                    preSignedCommand, {
                    expiresIn: expireDuration
                })

                return {
                    key: key,
                    url: url,
                    size: object.Size,
                    lastModified: object.LastModified
                }
            })
    ])
}