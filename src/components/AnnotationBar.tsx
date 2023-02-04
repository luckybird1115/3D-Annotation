import React from 'react';
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import type { PaginationProps } from 'antd';
import { Pagination } from 'antd';
import { Annotation } from "@external-lib";
import { Select, Button, Form, Input, Checkbox } from "antd";
import { PlusOutlined, EditFilled, DeleteFilled, EyeTwoTone, EyeInvisibleTwoTone } from "@ant-design/icons";
import type { CheckboxChangeEvent } from 'antd/es/checkbox';
import {
    AnnotationExtends,
    visitAnnotationExtends,
    AreaAnnotationExtends,
    GroupAnnotationExtends,
    PointAnnotationExtends,
} from 'user-types'
const { Search } = Input;

const validateMessages = {
    required: '${label} is required!',
};

interface AnnotationControllerProps{
    /**
     * Called when annotation type is changed.
     * @param event React Select Change Event
     */
    updateAnnotationType: (value: string) => void;

    /**
     * Called when annotation is added.
     * @param a AnnotationBuffer Interface
     */
    insertAnnotation: (title: string, description: string) => void;

    /**
     * Called when annotation is removed.
     * @param id AnnotationBuffer id String
     */
    removeAnnotation: (annotation: AnnotationExtends) => void;

    /**
     * Called when annotation is updated.
     * @param id AnnotationBuffer id String
     * @param a AnnotationBuffer Interface
     */
    updateAnnotation: (annotation: AnnotationExtends) => void;

    /**
     * Called when current control view status is changed.
     * @param s String
     */
    updateControlStatus: (s: string) => void;

    /**
     * Called when annotation list is clicked.
     * @param id number
     * @param key string(select, unselect)
     */
    selectAnnotationControl: (a: AnnotationExtends, key: string) => void;

    /**
     * Called when search string is changed.
     * @param value string
     */
    changeSearch: (value: string) => void;

    /**
     * Called when show all is clicked.
     * @param value string
     */
    checkAllChange: (checked: boolean) => void;

    /**
     * Called when annotaion hide or delete -- this is for heatmap and area annotation.
     * @param value string
     */
    setDelOrHide: (value: boolean) => void;

    /**
     * The list of annotations buffers for the given model.
     */
    annotations: AnnotationExtends[];

    /**
     * current control view status
     */
    controlStatus: string;
}

export function AnnotationBar({
    updateAnnotationType,
    insertAnnotation,
    updateAnnotation,
    removeAnnotation,
    selectAnnotationControl,
    updateControlStatus,
    changeSearch,
    checkAllChange,
    setDelOrHide,
    annotations,
    controlStatus
}: AnnotationControllerProps) {
    /**
     * form using antd module.
     */
    const [form] = Form.useForm();
    /**
     * showALl checked status(true, false)
     */
    const [checkAll, setCheckAll] = React.useState(true);
    /**
     * check list by following each annotation(boolean array)
     */
    const [isChecked, setIsChecked] = React.useState([] as boolean[]);
    /**
     * check list by following each annotation(boolean array)
     */
    const [currentPage, setCurrentPage] = React.useState(1);
    /**
     * useEffect function when call by following props annotation's changing.
     */
    React.useEffect(() => {
        const checkArray = annotations.map((a) => a.display)
        setIsChecked(checkArray);
        setCheckAll(annotations.filter(a => a.display).length === annotations.length);
    }, [annotations]);

    /**
     * call when add box's cancel buttton and edit box's cancel button click.
     */
    const handleCancelClick = (ev: React.MouseEvent, key: string) => {
        ev.preventDefault();

        if (key === 'add') {
            removeAnnotation({} as AnnotationExtends);
        }

        updateControlStatus("normal");
    }

    /**
     * call when user clicks add buttton on add box
     */
    const handleAddClick = (ev: React.MouseEvent) => {
        ev.preventDefault();
        updateControlStatus("annotation");
    }

    /**
     * submit call when user clicks save button to save annotation
     */
    const handleSaveClick = (values: any) => {
        insertAnnotation(values.title, values.description);
    }

    /**
     * submit call when user clicks change button to update annotation
     */
    const handleChangeClick = (values: any, annotation: AnnotationExtends) => {
        annotation.title = values.title;
        annotation.description = values.description;

        updateAnnotation(annotation);
    }

    /**
     * submit call when user clicks delete button
     */
    const handleDeleteClick = (ev: React.MouseEvent, annotation: AnnotationExtends) => {
        ev.preventDefault();
        setDelOrHide(true);
        removeAnnotation(annotation);
    }

    /**
     * link call when user clicks edit button
     */
    const handleEditClick = (ev: React.MouseEvent, annotation: AnnotationExtends) => {
        ev.preventDefault();

        form.setFieldsValue({ title: annotation.title, description: annotation.description });
        updateControlStatus('edit' + annotation.id);
    }

    /**
     * call when user clicks annotation controller on annotation list
     */
    const handleAnnotationClick = (ev: React.MouseEvent, annotation: AnnotationExtends, key: string) => {
        ev.preventDefault();

        selectAnnotationControl(annotation, key);
    }

    /**
     * call when user inputs on search bar
     */
    const onSearch = (value: string) => {
        changeSearch(value);
    };

    /**
     * call when user clicks check all checked button
     */
    const onCheckAllChange = (e: CheckboxChangeEvent) => {
        checkAllChange(e.target.checked);
        setCheckAll(e.target.checked);
        setDelOrHide(true);
    }

    /**
     * call when user checks each annotation controller on annotation list
     */
    const onCheckAnnotation = (checked: boolean, annotation: AnnotationExtends, index: number) => {
        updateAnnotation(Object.assign({...annotation}, {display: checked}))
        setDelOrHide(true);
    };

    const onChangePage: PaginationProps['onChange'] = (page) => {
        setCurrentPage(page);
    };
    return (
        <div style={{
            border: '1px dark solid',
            position: "absolute",
            textAlign: 'center',
            width: "250px",
            top: "5%",
            right: "5%",
            zIndex: 100,
            background: 'rgba(55,55,55,0.4)'
        }}>
            <Search placeholder="input search text" onSearch={onSearch} enterButton onChange={(ev: React.ChangeEvent) => onSearch(((ev.target) as any).value)} />
            <p style={{color: 'white'}}>Select the type of annotation</p>
            <div>
                <Select
                    defaultValue="Point"
                    style={{ width: 120, marginRight: 10}}
                    onChange={updateAnnotationType}
                    options={[
                        { value: 'point', label: 'Point' },
                        { value: 'area', label: 'Area' },
                        { value: 'heatmap', label: 'Heatmap' },
                        { value: 'group', label: 'group', disabled: true },
                    ]}
                />
                {
                    controlStatus !== 'normal'?
                        <Button type="primary" shape="circle" icon={<PlusOutlined />} disabled></Button> :
                        <Button type="primary" shape="circle" icon={<PlusOutlined />} onClick={handleAddClick}></Button>
                }
            </div>
            <div style={{marginTop: '10px', height: '450px', overflow: 'auto'}}>
                {
                    controlStatus === 'annotation' ?
                        <p style={{color: 'red'}}>Please select annotation</p> : ''
                }
                {
                    controlStatus === 'add' ?
                        <Form
                            layout="vertical"
                            name="nest-messages"
                            onFinish={handleSaveClick}
                            style={{ maxWidth: 600, padding: 10, background: 'rgba(10,10,10,0.6)', margin: 5, borderRadius: 5 }}
                            validateMessages={validateMessages}
                        >
                            <Form.Item name="title" rules={[{ required: true }]} style={{marginBottom: 5}}>
                                <Input placeholder="title" />
                            </Form.Item>
                            <Form.Item name="description" rules={[{ required: true }]} style={{marginBottom: 5}}>
                                <Input.TextArea placeholder="description" />
                            </Form.Item>
                            <Form.Item style={{marginBottom: 0}}>
                                <Button type="primary" htmlType="submit" style={{marginRight: 5}}>
                                    Save
                                </Button>
                                <Button htmlType="button" onClick={(ev: React.MouseEvent) => {handleCancelClick(ev, 'add')}}>
                                    Cancel
                                </Button>
                            </Form.Item>
                        </Form> : ''
                }
                <div style={{margin: '0 10px', textAlign: 'left'}}>
                    <Checkbox onChange={onCheckAllChange} checked={checkAll} style={{color: 'white'}}>
                        {'show all' + ' ' + '(' + annotations.filter((annotation, index) => annotation.display).length + ')'}
                    </Checkbox>
                </div>
                {
                    annotations.map((a, i) => {
                        if (controlStatus === ('edit' + a.id)) {
                            return (
                                <Form
                                    layout="vertical"
                                    name="nest-messages"
                                    onFinish={(values: any) => {handleChangeClick(values, a)}}
                                    style={{ maxWidth: 600, padding: 10, background: '#4b4f52', margin: 5, borderRadius: 5 }}
                                    validateMessages={validateMessages}
                                    form={form}
                                    key={a.id}
                                >
                                    <Form.Item name="title" rules={[{ required: true }]} style={{marginBottom: 5}}>
                                        <Input placeholder="title" />
                                    </Form.Item>
                                    <Form.Item name="description" rules={[{ required: true }]} style={{marginBottom: 5}}>
                                        <Input.TextArea placeholder="description" />
                                    </Form.Item>
                                    <Form.Item style={{marginBottom: 0}}>
                                        <Button type="primary" htmlType="submit" style={{marginRight: 5}}>
                                            Save
                                        </Button>
                                        <Button htmlType="button" onClick={(ev: React.MouseEvent) => {handleCancelClick(ev, 'change')}}>
                                            Cancel
                                        </Button>
                                    </Form.Item>
                                </Form>
                            )
                        } else {
                            const bg = a.select ? 'rgba(30,30,30,0.5)': 'rgba(120,120,120,0.4)';
                            return (
                                <div key={a.id}>
                                    {(i<currentPage*4) && (i + 1>(currentPage-1)*4) &&
                                        <Card className="annotation-list" style={{background: bg, margin: 5, textAlign: 'left'}} key={a.id}>
                                            <CardContent style={{padding: '0 5px'}}>
                                                <Checkbox onChange={(ev: CheckboxChangeEvent) => {onCheckAnnotation(ev.target.checked, a, i)}} checked={isChecked[i]} style={{color: 'white'}}>
                                                    <Typography gutterBottom variant="h5" component="h5" style={{marginBottom: '0px', fontSize: '15px'}}>
                                                        {a.title}
                                                    </Typography>
                                                    <Typography variant="body2" color="textSecondary" component="p" style={{marginBottom: '0px', fontSize: '12px', color: 'white'}}>
                                                        {a.description}
                                                    </Typography>
                                                </Checkbox>
                                            </CardContent>
                                            <CardActions disableSpacing style={{textAlign: "right", padding: '3px', display: 'block'}}>
                                                {
                                                    !a.select ?
                                                        a.display ?
                                                            <Button icon={<EyeTwoTone />} onClick={(ev: React.MouseEvent) => {handleAnnotationClick(ev, a, 'select')}} /> :
                                                            <Button icon={<EyeTwoTone />} disabled />
                                                        : a.display ? <Button icon={<EyeInvisibleTwoTone />} onClick={(ev: React.MouseEvent) => {handleAnnotationClick(ev, a, 'unselect')}} /> :
                                                            <Button icon={<EyeInvisibleTwoTone />} disabled />
                                                }
                                                <Button icon={<EditFilled />} onClick={(ev: React.MouseEvent) => {handleEditClick(ev, a)}} />
                                                <Button icon={<DeleteFilled />} onClick={(ev: React.MouseEvent) => {handleDeleteClick(ev, a)}} />
                                            </CardActions>
                                        </Card>
                                    }
                                </div>
                            )
                        }
                    })
                }
                <Pagination current={currentPage} onChange={onChangePage} defaultPageSize={4} total={annotations.length} hideOnSinglePage style={{'position' : 'absolute', 'bottom': '15px'}}/>
            </div>
        </div>
    );
}