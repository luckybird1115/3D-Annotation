import React from 'react';
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

import { Grid, Paper, TextField } from "@mui/material";
import { Annotation } from "@external-lib";

interface AnnotationControllerProps{
    /**
     * Called when annotation type is changed.
     * @param event React Select Change Event
     */
    updateAnnotationType: (event: React.FormEvent) => void;

    /**
     * Called when annotation is added.
     * @param a AnnotationBuffer Interface
     */
    insertAnnotation: (title: string, description: string) => void;

    /**
     * Called when annotation is removed.
     * @param id AnnotationBuffer id String
     */
    removeAnnotation: (id: number) => void;

    /**
     * Called when annotation is updated.
     * @param id AnnotationBuffer id String
     * @param a AnnotationBuffer Interface
     */
    updateAnnotation: (id: number, a: Annotation) => void;

    /**
     * Called when current control view status is changed.
     * @param s String
     */
    updateControlStatus: (s: string) => void;

    /**
     * Called when annotation list is clicked.
     * @param id number
     */
    selectAnnotationId: (id: number) => void;

    /**
     * The list of annotations buffers for the given model.
     */
    annotations: Annotation[];

    /**
     * current control view status
     */
    controlStatus: string;
}

export function ViewerControl({
    updateAnnotationType,
    insertAnnotation,
    updateAnnotation,
    removeAnnotation,
    selectAnnotationId,
    updateControlStatus,
    annotations,
    controlStatus
}: AnnotationControllerProps) {
    const [title, setTitle] = React.useState('' as string);
    const [description, setDescription] = React.useState('' as string);

    React.useEffect(() => {
        if (controlStatus === 'normal') {
            setTitle('');
            setDescription('');
        }
    }, [controlStatus]);

    const handleCancelClick = (ev: React.MouseEvent, key: string) => {
        ev.preventDefault();

        if (key === 'add') {
            removeAnnotation(0);
        }

        updateControlStatus("normal");
    }

    const handleAddClick = (ev: React.MouseEvent) => {
        ev.preventDefault();

        updateControlStatus("annotation");
    }

    const handleSaveClick = (ev: React.MouseEvent) => {
        ev.preventDefault();

        if (!title) {
            alert('Please input the title!');
            return;
        } else if (!description) {
            alert('Please input the description!');
            return;
        }

        insertAnnotation(title, description);
    }

    const handleChangeClick = (ev: React.MouseEvent, id: number) => {
        ev.preventDefault();

        if (!title) {
            alert('Please input the title!');
            return;
        } else if (!description) {
            alert('Please input the description!');
            return;
        }

        const a = annotations.filter(a => a.id === id);
        let _a = a[0];
        _a.title = title;
        _a.description = description;

        updateAnnotation(id, _a);
    }

    const handleDeleteClick = (ev: React.MouseEvent, id: number) => {
        ev.preventDefault();

        removeAnnotation(id);
    }

    const handleEditClick = (ev: React.MouseEvent, id: number) => {
        ev.preventDefault();

        const a = annotations.filter(a => a.id === id);
        setTitle(a[0].title);
        setDescription(a[0].description);
        updateControlStatus('edit' + id);
    }

    const handleTitleChange = (ev: React.ChangeEvent) => {
        ev.preventDefault();
        setTitle(((ev.target) as any).value);
    }

    const handleDescriptionChange = (ev: React.ChangeEvent) => {
        ev.preventDefault();
        setDescription(((ev.target) as any).value);
    }

    const handleListClick = (ev: React.MouseEvent, id: number) => {
        ev.preventDefault();
        selectAnnotationId(id);
    }

    return (
        <div style={{
            'border': '1px dark solid',
            'position': "absolute",
            'width': "250px",
            'top': "10%",
            'right': "5%",
            'zIndex': "10000",}}>
            <center>
                <p>Select the type of annotation</p>
                <select
                    style={{'height': '35px', 'width': '140px', 'marginRight': '10px'}}
                    className="form-control"
                    id="searchType"
                    onChange={ updateAnnotationType }>
                    <option value="point">Point</option>
                    <option value="area" disabled>Area</option>
                    <option value="group" disabled>Group</option>
                    <option value="path" disabled>Path</option>
                </select>
                {
                    controlStatus !== 'normal'? <Button color="primary" variant="contained" disabled> Add </Button> : <Button color="primary" variant="contained" onClick={handleAddClick}> Add </Button>
                }
                {
                    controlStatus === 'annotation' ?
                        <Grid item xs={12} sm={12} md={12}>
                            <Typography gutterBottom color="red" fontSize="0.9em">
                                *Please select annotation.
                            </Typography>
                        </Grid> : ''
                }
            </center>
            <div style={{marginTop: '10px', height: '450px', overflow: 'auto'}}>
                {
                    controlStatus === 'add' ?
                        <Grid item xs={12} sm={12} md={12} marginTop="5px">
                            <Paper style={{background: '#b0b9e1'}}>
                                <Grid item xs={12} padding="5px">
                                    <input  placeholder="title" onChange={handleTitleChange} height="30px" value={title} style={{width: '98%', background: '#ffffff', height: '30px', fontSize: '15px', border: '1px solid #b0b9e1'}}></input>
                                </Grid>
                                <Grid item xs={12} padding="5px">
                                    <input  placeholder="description" onChange={handleDescriptionChange} value={description} style={{width: '98%', background: '#ffffff', height: '30px', fontSize: '13px', border: '1px solid #b0b9e1'}}></input>
                                </Grid>
                                <Grid item xs={12} textAlign="right">
                                    <Button size="small" color="primary" onClick={handleSaveClick}>
                                        Save
                                    </Button>
                                    <Button size="small" color="secondary" onClick={(ev: React.MouseEvent) => {handleCancelClick(ev, 'add')}}>
                                        Cancel
                                    </Button>
                                </Grid>
                            </Paper>
                        </Grid> : ''
                }
                {
                    annotations.map(a => {
                        if (controlStatus === ('edit' + a.id)) {
                            return (
                                <Grid item xs={12} sm={12} md={12} marginTop="2px">
                                    <Paper style={{background: '#b0b9e1'}}>
                                        <Grid item xs={12} padding="5px">
                                            <input  placeholder="title" onChange={handleTitleChange} height="30px" value={title} style={{width: '98%', background: '#ffffff', height: '30px', fontSize: '15px', border: '1px solid #b0b9e1'}}></input>
                                        </Grid>
                                        <Grid item xs={12} padding="5px">
                                            <input  placeholder="description" onChange={handleDescriptionChange} value={description} style={{width: '98%', background: '#ffffff', height: '30px', fontSize: '13px', border: '1px solid #b0b9e1'}}></input>
                                        </Grid>
                                        <Grid item xs={12} textAlign="right">
                                            <Button size="small" color="primary" onClick={(ev: React.MouseEvent) => {handleChangeClick(ev, a.id)}}>
                                                Change
                                            </Button>
                                            <Button size="small" color="secondary" onClick={(ev: React.MouseEvent) => {handleCancelClick(ev, 'change')}}>
                                                Cancel
                                            </Button>
                                        </Grid>
                                    </Paper>
                                </Grid>
                            )
                        } else {
                            return (
                                <Card className="annotation-list" style={{background: '#afafaf', marginTop: '2px'}} onClick={(ev: React.MouseEvent) => {handleListClick(ev, a.id)}}>
                                    <CardContent style={{padding: '5px 15px 0px 15px'}}>
                                        <Typography gutterBottom variant="h5" component="h5" style={{marginBottom: '0px', fontSize: '15px'}}>
                                            {a.title}
                                        </Typography>
                                        <Typography variant="body2" color="textSecondary" component="p" style={{marginBottom: '0px', fontSize: '12px'}}>
                                            {a.description}
                                        </Typography>
                                    </CardContent>
                                    <CardActions disableSpacing style={{textAlign: "right", padding: '3px', display: 'block'}}>
                                        <Button size="small" color="primary" onClick={(ev: React.MouseEvent) => {handleEditClick(ev, a.id)}}>
                                            Edit
                                        </Button>
                                        <Button size="small" color="secondary" onClick={(ev: React.MouseEvent) => {handleDeleteClick(ev, a.id)}}>
                                            Delete
                                        </Button>
                                    </CardActions>
                                </Card>
                            )
                        }
                    })
                }
            </div>
        </div>
    );
}
