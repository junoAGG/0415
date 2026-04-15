import { useState } from 'react';
import { Modal, Upload, Button, message, List } from 'antd';
import { InboxOutlined, FilePdfOutlined, FileTextOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { reportApi } from '../services/api';

const { Dragger } = Upload;

interface UploadModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UploadModal({ visible, onClose, onSuccess }: UploadModalProps) {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);


  const beforeUpload = (file: UploadFile) => {
    // 检查文件类型
    const isValidType = file.type === 'application/pdf' || 
                        file.type === 'text/html' ||
                        file.name.endsWith('.pdf') ||
                        file.name.endsWith('.html') ||
                        file.name.endsWith('.htm');
    
    if (!isValidType) {
      message.error(`${file.name} 不是支持的文件格式，仅支持 PDF 和 HTML`);
      return Upload.LIST_IGNORE;
    }

    // 检查文件大小 (50MB)
    const isLt50M = (file.size || 0) / 1024 / 1024 < 50;
    if (!isLt50M) {
      message.error(`${file.name} 超过 50MB 限制`);
      return Upload.LIST_IGNORE;
    }

    return false; // 阻止自动上传
  };

  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.warning('请选择要上传的文件');
      return;
    }

    if (fileList.length > 10) {
      message.warning('一次最多上传 10 个文件');
      return;
    }

    setUploading(true);

    try {
      // 创建 FileList 对象
      const dataTransfer = new DataTransfer();
      fileList.forEach((file) => {
        if (file.originFileObj) {
          dataTransfer.items.add(file.originFileObj);
        }
      });

      const result = await reportApi.upload(dataTransfer.files);

      if (result.failed.length > 0) {
        message.warning(`${result.failed.length} 个文件上传失败`);
      }

      if (result.uploaded.length > 0) {
        message.success(`成功上传 ${result.uploaded.length} 个文件`);
        setFileList([]);
        onSuccess();
      }
    } catch (error) {
      message.error('上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (filename: string) => {
    if (filename.endsWith('.pdf')) {
      return <FilePdfOutlined className="text-red-500" />;
    }
    return <FileTextOutlined className="text-blue-500" />;
  };

  return (
    <Modal
      title="上传研报"
      open={visible}
      onCancel={onClose}
      width={600}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button
          key="upload"
          type="primary"
          loading={uploading}
          onClick={handleUpload}
          disabled={fileList.length === 0}
        >
          {uploading ? '上传中...' : `上传 (${fileList.length})`}
        </Button>,
      ]}
    >
      <Dragger
        multiple
        fileList={fileList}
        beforeUpload={beforeUpload}
        onChange={({ fileList: newFileList }) => setFileList(newFileList)}
        showUploadList={false}
        accept=".pdf,.html,.htm"
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">点击或拖拽文件到此处上传</p>
        <p className="ant-upload-hint">
          支持 PDF、HTML 格式，单个文件不超过 50MB，一次最多 10 个文件
        </p>
      </Dragger>

      {fileList.length > 0 && (
        <div className="mt-4">
          <h4 className="mb-2">已选择的文件 ({fileList.length})：</h4>
          <List
            size="small"
            bordered
            dataSource={fileList}
            renderItem={(file) => (
              <List.Item
                actions={[
                  <Button
                    type="text"
                    danger
                    size="small"
                    onClick={() => {
                      setFileList(fileList.filter((f) => f.uid !== file.uid));
                    }}
                  >
                    移除
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  avatar={getFileIcon(file.name)}
                  title={file.name}
                  description={`${((file.size || 0) / 1024 / 1024).toFixed(2)} MB`}
                />
              </List.Item>
            )}
          />
        </div>
      )}
    </Modal>
  );
}
