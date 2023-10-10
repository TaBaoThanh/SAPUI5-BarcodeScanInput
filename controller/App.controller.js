sap.ui.define([
	'sap/ui/core/mvc/Controller',
	"sap/ui/model/json/JSONModel",
	'sap/m/MessageToast'
], function (Controller, JSONModel, MessageToast) {
	"use strict";

	return Controller.extend("sap.m.custom.BarcodeScanInput.controller.App", {
		_data: {
			"htmltext": "This is a long text that needs to be&#13;&#10;  expanda\r\n or \u000d\u000able. It clongan contain more content when expanded."
		},
		onInit: function () {
			var oModel = new JSONModel(this._data);
			this.getView().setModel(oModel);
		},
		
		onTakePhoto: function(oEvent) {
			var image = oEvent.getParameter("ImageSrc");
		}
	});
});