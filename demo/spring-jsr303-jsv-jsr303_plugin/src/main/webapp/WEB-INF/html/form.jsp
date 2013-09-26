<%@ taglib uri="http://www.springframework.org/tags" prefix="spring" %>
<%@ taglib uri="http://www.springframework.org/tags/form" prefix="form" %>

<%@taglib prefix="JSV" uri="http://ippon.fr/projects/jsv/" %>

<spring:url value="/validate" javaScriptEscape="true" var="validate_url"/>
<spring:url value="/validate2" javaScriptEscape="true" var="validate_url2"/>

<form:form commandName="formBean" method="POST"
		   cssClass="uni-form" servletRelativeAction="/send" id="FormBean">
	<div id="FormBean_errors">

	</div>

	<div class="ctrl-holder">
		<form:label path="firstname">
			<spring:message code="firstname.label"/>
		</form:label>
		<form:input path="firstname"/>
		<div id="firstname_error" class="error"></div>
	</div>

	<div class="ctrl-holder">
		<form:label path="lastname">
			<spring:message code="lastname.label"/>
		</form:label>
		<form:input path="lastname"/>
		<div id="lastname_error" class="error"></div>
	</div>

	<div class="ctrl-holder">
		<form:label path="age">
			<spring:message code="age.label"/>
		</form:label>
		<form:input path="age"/>
		<div id="age_error" class="error"></div>
	</div>

	<div class="ctrl-holder">
		<form:label path="languages">
			<spring:message code="languages.label"/>
		</form:label>
		<form:checkboxes items="${formBean.languageList}" path="languages"/>
		<div id="languages_error" class="error"></div>
	</div>

	<div class="ctrl-holder">
		<form:label path="sports">
			<spring:message code="sports.label"/>
		</form:label>
		<form:select path="sports" items="${formBean.sportList}" multiple="true"/>
		<div id="sports_error" class="error"></div>
	</div>

	<div class="ctrl-holder">
		<form:label path="promoCode">
			<spring:message code="promoCode.label"/>
		</form:label>
		<form:input path="promoCode"/>
		<div id="promoCode_error" class="error"></div>
	</div>

	<input type="button" id="test_button" value="test button"/>

	<div class="ctrl-holder">
		<input type="submit" value="<spring:message code="send" />">
	</div>
</form:form>

<script type="text/javascript" src="js/jsv.min.js"></script>
<JSV:validator formId="FormBean" form="${formBean}" var="formBeanValidator">
	{
	errorLocalMessageTemplate: "<span class='{{class}} test'>{{message}}</span>",
	ajaxValidateFieldURL:"${validate_url2}",
	ajaxValidateFieldParams: function(objectName, fieldName, fieldvalue, constaints){
	var data = {
	fieldName: fieldName,
	constraints: constaints
	};
	data[fieldName] = fieldvalue;
	return data;
	},
	debug:true
	}
</JSV:validator>
<script type="text/javascript">
	var firstNamefield = formBeanValidator.getFieldWithName("firstname");
	var lastNamefield = formBeanValidator.getFieldWithName("lastname");
	var promofield = formBeanValidator.getFieldWithName("promoCode");
	var sportsfield = formBeanValidator.getFieldWithName("sports");
	var form = formBeanValidator.getForm();

	// ELEMENT SCOPE
	formBeanValidator.bindValidationToElement("FormBean", "submit", true)
			.addPreValidationProcess(function (event) {
				console.log("PRE VALID");
			})
			.addPostValidationProcess(function (event, fieldViolations) {
				console.log("POST VALID");
			})
			.bindField([firstNamefield, lastNamefield, promofield])
			.addPreValidationProcess(function (event, field) {
				console.log("PRE VALID SPECIFIC");
			})
			.addPostValidationBeforeMessageProcess(function (event, field, ruleViolations) {
				console.log("POST VALID SPECIFIC BEFORE");
			})
			.addPostValidationAfterMessageProcess(function (event, field, ruleViolations) {
				console.log("POST VALID SPECIFIC AFTER");
			});

	// FIELD SCOPE
	sportsfield.bindValidationToEvent("change")
			.addPreValidationProcess(function(event, field){
				console.log("PRE VALID SPECIFIC SPORTS");
			})
			.addPostValidationBeforeMessageProcess(function(event, field, ruleViolations){
				console.log("POST VALID SPECIFIC BEFORE SPORTS")
			})
			.addPostValidationAfterMessageProcess(function(event, field, ruleViolations){
				console.log("POST VALID SPECIFIC AFTER SPORTS")
			})
			.setValidationDelay(500);

	// APP SCOPE
	formBeanValidator.getForm()
			.addFieldsPreValidationProcess(function (event, field) {
				console.log("PRE VALID SPECIFIC GLOBAL");
			}).addFieldsPostValidationBeforeMessageProcess(function (event, field, ruleViolations) {
				console.log("POST VALID SPECIFIC BEFORE GLOBAL");
			}).addFieldsPostValidationAfterMessageProcess(function (event, field, ruleViolations) {
				console.log("POST VALID SPECIFIC AFTER GLOBAL");
			})
</script>