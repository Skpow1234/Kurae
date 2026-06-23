package storage

import (
	"context"
	"errors"
	"fmt"
	"path"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
	"github.com/kurae/kurae-api/internal/config"
)

var (
	ErrUploadsDisabled = errors.New("uploads not configured")
	ErrInvalidMIME    = errors.New("invalid content type")
)

var allowedMIME = map[string]bool{
	"image/jpeg": true,
	"image/png":  true,
	"image/webp": true,
}

type PresignResult struct {
	UploadURL string `json:"uploadUrl"`
	PublicURL string `json:"publicUrl"`
	Key       string `json:"key"`
}

type S3Storage struct {
	client *s3.Client
	bucket string
	region string
}

func NewS3Storage(cfg config.Config) (*S3Storage, error) {
	if cfg.S3Bucket == "" || cfg.AWSAccessKey == "" || cfg.AWSSecretKey == "" {
		return nil, ErrUploadsDisabled
	}

	region := cfg.S3Region
	if region == "" {
		region = "us-east-1"
	}

	awsCfg, err := awsconfig.LoadDefaultConfig(context.Background(),
		awsconfig.WithRegion(region),
		awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			cfg.AWSAccessKey, cfg.AWSSecretKey, "",
		)),
	)
	if err != nil {
		return nil, err
	}

	return &S3Storage{
		client: s3.NewFromConfig(awsCfg),
		bucket: cfg.S3Bucket,
		region: region,
	}, nil
}

func (s *S3Storage) PresignUpload(ctx context.Context, sellerID, filename, contentType string) (PresignResult, error) {
	if !allowedMIME[contentType] {
		return PresignResult{}, ErrInvalidMIME
	}

	ext := strings.ToLower(path.Ext(filename))
	if ext == "" {
		switch contentType {
		case "image/jpeg":
			ext = ".jpg"
		case "image/png":
			ext = ".png"
		case "image/webp":
			ext = ".webp"
		}
	}

	key := fmt.Sprintf("sellers/%s/%s%s", sellerID, uuid.NewString(), ext)
	presigner := s3.NewPresignClient(s.client)

	out, err := presigner.PresignPutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.bucket),
		Key:         aws.String(key),
		ContentType: aws.String(contentType),
	}, s3.WithPresignExpires(15*time.Minute))
	if err != nil {
		return PresignResult{}, err
	}

	publicURL := fmt.Sprintf("https://%s.s3.%s.amazonaws.com/%s", s.bucket, s.region, key)
	return PresignResult{
		UploadURL: out.URL,
		PublicURL: publicURL,
		Key:       key,
	}, nil
}
